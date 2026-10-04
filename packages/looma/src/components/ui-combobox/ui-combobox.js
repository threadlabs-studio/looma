import { afterFormReset } from "../shared/form-reset.js";
import { closeOverlay, createAnchoredSurface, openOverlay } from "../shared/overlay.js";

const instances = new WeakMap();

let comboboxes = 0;

// An option's secondary line and tag ride on data-* attributes: <option> holds only text, so markup inside
// it would run into its label before JavaScript. A row without them keeps the declared shape exactly.
function authoredOptions(container) {
  return Array.from(container.querySelectorAll("option")).map((option, index) => {
    const { description, tag, tagTone, tagColor } = option.dataset;
    const group = option.closest("optgroup")?.label;
    return {
      id: option.id || option.value || `option-${index}`,
      value: option.value,
      label: option.label || option.textContent?.trim() || option.value,
      ...(group ? { group } : {}),
      disabled: option.disabled,
      ...(description ? { description } : {}),
      ...(tag ? { tag: { label: tag, ...(tagTone ? { tone: tagTone } : {}), ...(tagColor ? { color: tagColor } : {}) } } : {}),
    };
  });
}

export async function validate(host) {
  return instances.get(host.element)?.validate();
}

export async function focusInput(host) {
  instances.get(host.element)?.input?.focus();
}

export default function controller(host) {
  const element = host.element;
  const document = element.ownerDocument;
  const uid = `ui-combobox-${++comboboxes}`;
  const overlayId = uid;
  const { input, field, popup, options: authored } = host.refs;
  host.state.uid = uid;
  let surface;
  let lookup;
  let validationRun;
  let composing = false;
  let alive = true;
  let fullSet = false;
  let initialRaw = "";
  let awaitingLabel = null;
  let proposedChange;
  let lastValue = host.props.value.value;
  let lastQuery = host.props.query.value;
  const knownOptions = new Map();

  // Options come from authored <option>/<optgroup> children; everything else is an attribute.
  const config = () => ({
    options: authoredOptions(authored),
    allowFreeText: Boolean(host.props.allowFreeText.value),
    allowCreate: Boolean(host.props.allowCreate.value),
    // "none": the consumer already narrowed the options (a server search), so every one is listed.
    filterByLabel: host.props.filter.value !== "none",
  });
  const authoredDefaults = () => {
    const values = new Set(Array.from(authored.querySelectorAll("option[selected]"), (option) => option.value));
    return config().options.filter((option) => values.has(option.value));
  };
  // Selected items work uncontrolled: the component keeps them and reports every change. A consumer
  // that owns `items` stays in charge, because the prop resyncs whatever it sets. A consumer that sets
  // `selectedValues` controls the selection: the chips follow it, and a user's change is only reported.
  const items = () => host.props.multiple.value && Array.isArray(host.state.internalItems) ? host.state.internalItems : [];
  const selectedSet = () => new Set(items().map((item) => item.value));
  const controlledValues = () => Array.isArray(host.props.selectedValues.value);
  // Each controlled value shows its authored option; a value no option describes yet keeps the chip it
  // had, or shows the value itself until its option arrives. A repeated value shows once: the chips and
  // hidden inputs are keyed by value. Array.from, not a spread: a loose transpile turns [...set] into [set].
  const itemsForValues = () => {
    const options = config().options;
    return Array.from(new Set(host.props.selectedValues.value)).map((value) => asItem(options.find((option) => option.value === value)
      ?? items().find((item) => item.value === value) ?? { id: value, value, label: value }));
  };
  const markSelectedRows = () => {
    if (!host.props.multiple.value || !host.state.rows?.length) return;
    const selected = selectedSet();
    host.state.rows = host.state.rows.map((row) => ({ ...row, selected: selected.has(row.value) }));
  };
  const syncValues = () => {
    if (!controlledValues()) return;
    const next = itemsForValues();
    // An equal selection (a re-rendered literal, an unrelated option edit) leaves the chips alone.
    if (JSON.stringify(next) === JSON.stringify(items())) return;
    host.state.internalItems = next;
    markSelectedRows();
  };
  const setValidation = (result, touched = host.state.validation?.touched ?? false) => {
    const issues = result.issues ?? [];
    const blocking = issues.some((issue) => issue.severity !== "warning");
    host.state.validation = {
      status: blocking ? "error" : issues.length ? "warning" : "valid",
      touched,
      dirty: host.state.raw !== initialRaw,
      ...result,
      issues,
    };
    host.dispatch("validation-change", host.state.validation);
  };
  const resetValidation = () => {
    validationRun?.abort();
    host.state.validation = {
      status: "pristine",
      touched: host.state.validation?.touched ?? false,
      dirty: host.state.raw !== initialRaw,
      issues: [],
    };
    host.dispatch("validation-change", host.state.validation);
  };
  const cancelLookup = () => {
    lookup?.abort();
    lookup = undefined;
  };
  const close = () => {
    host.state.expanded = false;
    host.state.active = -1;
    cancelLookup();
    surface.hide();
    closeOverlay(document, overlayId);
  };
  const canCreate = () => {
    const current = config();
    const candidates = current.options ? [...current.options, ...(host.state.rows ?? [])] : (host.state.rows ?? []);
    return Boolean(current.allowCreate && String(host.state.raw).trim() && !host.props.loading.value && !host.state.lookupError
      && !candidates.some((row) => row.label.toLocaleLowerCase() === String(host.state.raw).toLocaleLowerCase()));
  };
  const search = (reason) => {
    cancelLookup();
    fullSet = reason === "disclosure";
    host.state.active = -1;
    host.state.lookupError = "";
    const current = config();
    const query = fullSet ? "" : String(host.state.raw);
    const controller = new AbortController();
    lookup = controller;
    const applyOptions = (options) => {
      if (controller.signal.aborted || !alive) return;
      for (const option of options) knownOptions.set(option.value, option);
      const selectedOption = host.state.selected == null ? undefined : knownOptions.get(host.state.selected);
      if (host.props.query.value == null && awaitingLabel === host.state.selected && selectedOption) {
        host.state.raw = selectedOption.label;
        host.state.display = selectedOption.label;
        awaitingLabel = null;
          resetValidation();
      }
      const ids = new Set();
      const selected = host.props.multiple.value ? selectedSet() : undefined;
      // Multiple keeps its chosen options in the list, checked. Dropping them hid what was picked
      // from the list and from assistive technology, which only ever heard aria-selected="false".
      const filtered = options.filter((option) => {
        if (ids.has(option.id)) return false;
        ids.add(option.id);
        if (fullSet || !current.filterByLabel) return true;
        return option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase());
      }).map((option) => ({
        ...option,
        selected: selected ? selected.has(option.value) : option.value === host.state.selected
      }));
      const groups = new Map();
      for (const row of filtered) {
        const group = row.group ?? "";
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push(row);
      }
      // Keep iterable expansion explicit for the same legacy transform reason as
      // the group-name list below. Concatenating a Map iterator produces one
      // iterator row instead of the option objects it contains.
      host.state.rows = Array.from(groups.values()).flat();
      // When nothing matches what was typed, the offer to create it is the only choice, so it is
      // the one Enter makes, and it is highlighted as such.
      if (query && !host.state.rows.some((row) => !row.disabled) && canCreate()) host.state.active = host.state.rows.length;
      if (query && host.props.autoHighlight.value === "single") {
        const enabled = host.state.rows.flatMap((row, index) => row.disabled ? [] : [index]);
        if (enabled.length === 1) host.state.active = enabled[0];
      }
      // Options in their declared shape: a row's `selected` flag is the list's own view state.
      host.dispatch("options-change", host.state.rows.map(asItem));
    };
    applyOptions(current.options);
  };
  const open = (reason = "input") => {
    if (host.props.disabled.value || host.props.readonly.value) return;
    host.state.expanded = true;
    popup.style.minWidth = `${field.getBoundingClientRect().width}px`;
    surface.show();
    openOverlay({ id: overlayId, element: popup, relatedElements: [element], modal: false, requestClose: close });
    search(reason);
  };
  // The last option the user committed. A strict combobox keeps that selection while searching;
  // leaving with unmatched text restores its label rather than keeping the search draft.
  let lastSelection = null;
  const commit = (value, query, option, kind, trigger) => {
    awaitingLabel = null;
    if (kind === "selection") lastSelection = option;
    const queryChanged = query !== host.state.raw;
    if (host.props.value.value == null) host.state.selected = value;
    if (host.props.query.value == null && queryChanged) {
      host.state.raw = query;
      host.state.display = query;
    }
    resetValidation();
    const detail = { value, query, option, kind, trigger };
    const proposal = { value, query };
    proposedChange = proposal;
    host.dispatch("value-change", detail);
    if (queryChanged) host.dispatch("query-change", { query, display: query, trigger });
    if (kind === "create") host.dispatch("create-entry", detail);
    if (kind === "free-entry") host.dispatch("free-entry", detail);
    queueMicrotask(() => {
      if (proposedChange !== proposal) return;
      if (host.props.value.value != null && host.props.value.value !== proposal.value) syncValue();
      if (host.props.query.value != null && host.props.query.value !== proposal.query) syncQuery();
      proposedChange = undefined;
    });
  };
  const emitItems = (next, trigger) => {
    if (!controlledValues()) host.state.internalItems = next;
    host.dispatch("items-change", next);
    // Not `values`: Vue's adapter reads a modeled prop with `in`, and list-shaped details have
    // Array.prototype.values, so it would emit update:values wrongly.
    host.dispatch("selected-values-change", { selectedValues: next.map((item) => item.value), trigger });
  };
  const setMultiQuery = (query, trigger) => {
    if (host.props.query.value == null) {
      host.state.raw = query;
      host.state.display = query;
    }
    input.value = query;
    host.dispatch("query-change", { query, display: query, trigger });
  };
  // A row carries a view-only `selected` flag; an item is the option itself, in its declared shape.
  const asItem = ({ id, value, label, group, disabled, description, tag }) => ({
    id,
    value,
    label,
    ...(group === undefined ? {} : { group }),
    ...(disabled === undefined ? {} : { disabled }),
    ...(description === undefined ? {} : { description }),
    ...(tag === undefined ? {} : { tag })
  });
  const addSelectedItem = (row, trigger) => {
    const option = asItem(row);
    const current = items();
    host.dispatch("add-item", { item: option, index: current.length, trigger });
    emitItems([...current, option], trigger);
  };
  const createSelectedItem = (query, trigger) => { if (query) host.dispatch("create-item", { query, trigger }); };
  const choose = (index, trigger) => {
    const option = (host.state.rows ?? [])[index];
    if (option?.disabled) return;
    if (host.props.multiple.value) {
      if (option) {
        // A checked row toggles off: the list is the selection, so it has to work both ways.
        const position = items().findIndex((item) => item.value === option.value);
        if (position >= 0) removeItemAt(position, trigger);
        else addSelectedItem(option, trigger);
      }
      else if (canCreate() && index === host.state.rows.length) createSelectedItem(String(host.state.raw).trim(), trigger);
      else return;
      setMultiQuery("", trigger);
      // The list stays open so several can be chosen without reopening it.
      search("selection");
      input.focus();
      return;
    } else if (option) commit(option.value, option.label, asItem(option), "selection", trigger);
    else if (canCreate() && index === host.state.rows.length) commit(null, host.state.raw, null, "create", trigger);
    else return;
    close();
    input.focus();
    if (!host.props.multiple.value) queueMicrotask(() => void validateCurrent());
  };
  // A strict combobox (single, no free text, no create) behaves like a select: leaving it resolves the
  // typed text to a valid option (the highlighted one, an exact label, the first label it begins, or the
  // only remaining option); with no match it reverts to the previous selection, or empties the draft. With filter
  // "none" the remaining options are all of them, whatever their labels, so the only one listed counts.
  const resolveTyped = (trigger) => {
    const current = config();
    if (host.props.multiple.value || current.allowFreeText || current.allowCreate) return;
    const typed = String(host.state.raw ?? "");
    const selectedOption = (current.options ?? []).find((option) => option.value === host.state.selected)
      ?? knownOptions.get(host.state.selected) ?? lastSelection;
    if (selectedOption && selectedOption.label === typed) return;
    const restoreDraft = (label) => {
      if (host.props.query.value != null || label === host.state.raw) return;
      host.state.raw = label;
      host.state.display = label;
      resetValidation();
      host.dispatch("query-change", { query: label, display: label, trigger });
    };
    const query = typed.trim().toLocaleLowerCase();
    // Match against every option, not only the filtered list: filtering is asynchronous, and a fast
    // Tab can arrive before it settles. A highlighted row still wins.
    const rows = host.state.rows ?? [];
    const enabled = (current.options ?? []).filter((option) => !option.disabled);
    const highlighted = rows[host.state.active];
    const match = query === "" ? undefined
      : (highlighted && !highlighted.disabled ? highlighted : undefined)
        ?? enabled.find((row) => row.label.toLocaleLowerCase() === query)
        ?? enabled.find((row) => row.label.toLocaleLowerCase().startsWith(query))
        ?? (() => {
          const containing = current.filterByLabel ? enabled.filter((option) => option.label.toLocaleLowerCase().includes(query)) : enabled;
          return containing.length === 1 ? containing[0] : undefined;
        })();
    if (match && match.value !== host.state.selected) commit(match.value, match.label, match, "selection", trigger);
    else if (match) restoreDraft(match.label);
    else if (selectedOption) restoreDraft(selectedOption.label);
    else restoreDraft("");
  };
  const commitQuery = (trigger) => {
    const query = String(host.state.raw).trim();
    if (!query) return;
    const option = (host.state.rows ?? []).find((row) => row.label.trim().toLocaleLowerCase() === query.toLocaleLowerCase());
    // Typing a label already chosen just clears the text; adding it again would duplicate the chip.
    if (option) { setMultiQuery("", trigger); if (!selectedSet().has(option.value)) addSelectedItem(option, trigger); }
    else if (config().allowCreate) { setMultiQuery("", trigger); createSelectedItem(query, trigger); }
  };
  const itemButtons = () => Array.from(field.querySelectorAll(".item"));
  const removeItemAt = (index, trigger) => {
    const current = items();
    const item = current[index];
    if (!item || item.disabled || host.props.disabled.value || host.props.readonly.value) return;
    host.dispatch("remove-item", { item, index, trigger });
    emitItems(current.filter((_, position) => position !== index), trigger);
    requestAnimationFrame(() => itemButtons()[Math.min(index, itemButtons().length - 1)]?.focus?.() ?? input.focus());
  };
  const move = (key) => {
    const rows = host.state.rows ?? [];
    const indices = rows.flatMap((row, index) => row.disabled ? [] : [index]);
    if (canCreate()) indices.push(rows.length);
    if (!indices.length) return;
    const current = indices.indexOf(host.state.active);
    const next = key === "Home" ? 0 : key === "End" ? indices.length - 1 : key === "ArrowDown" ? Math.min(current + 1, indices.length - 1) : current < 0 ? indices.length - 1 : Math.max(0, current - 1);
    host.state.active = indices[next];
    requestAnimationFrame(() => document.getElementById(`${uid}-option-${host.state.active}`)?.scrollIntoView({ block: "nearest" }));
  };
  const validateCurrent = async () => {
    validationRun?.abort();
    const run = new AbortController();
    validationRun = run;
    host.state.validation = { ...host.state.validation, status: "pending", output: undefined };
    host.dispatch("validation-change", host.state.validation);
    try {
      // Native constraints and the free-text policy; application validation stays in the form.
      const current = config();
      const result = { output: host.state.raw, issues: [] };
      const empty = host.props.multiple.value ? !items().length : !String(host.state.raw).trim();
      if (host.props.required.value && empty) result.issues = [...result.issues, { message: "A value is required." }];
      else if (host.state.raw && host.state.selected === null && !current.allowFreeText && !current.allowCreate) result.issues = [...result.issues, { message: "Choose a suggestion." }];
      if (result.issues.some((issue) => issue.severity !== "warning")) result.output = undefined;
      if (!run.signal.aborted && alive) setValidation(result);
    } catch {}
    return host.state.validation;
  };
  const syncValue = () => {
    if (host.props.multiple.value || host.props.value.value == null) return;
    host.state.selected = host.props.value.value;
    if (host.props.query.value == null) {
      const proposal = proposedChange;
      const option = config().options?.find((row) => row.value === host.state.selected) ?? (host.state.selected == null ? undefined : knownOptions.get(host.state.selected));
      const nextRaw = proposal?.value === host.state.selected ? proposal.query : option?.label ?? host.state.selected ?? "";
      if (proposal?.value !== host.state.selected || nextRaw !== host.state.raw) {
        host.state.raw = nextRaw;
        host.state.display = nextRaw;
        }
      awaitingLabel = !option && host.state.selected !== null ? host.state.selected : null;
    }
    resetValidation();
  };
  const syncQuery = () => {
    if (host.props.query.value == null || host.props.query.value === host.state.raw) return;
    if (host.props.value.value == null && proposedChange?.query !== host.props.query.value) host.state.selected = null;
    awaitingLabel = null;
    host.state.raw = host.props.query.value;
    host.state.display = host.props.query.value;
    resetValidation();
    if (host.state.expanded) search("input");
  };
  // Everything the template renders from, derived from the current state.
  const updateView = () => {
    const rows = host.state.rows ?? [];
    const groups = [];
    rows.forEach((row, index) => {
      const name = row.group ?? "";
      let group = groups.find((candidate) => candidate.name === name);
      if (!group) {
        group = { name, role: name ? "group" : "presentation", label: name || null, rows: [] };
        groups.push(group);
      }
      // The label names the option and the tag and description describe it, as a listbox option's
      // label and description parts do; a row without either keeps its name from its content.
      const detail = [row.tag ? `${uid}-option-${index}-tag` : "", row.description ? `${uid}-option-${index}-description` : ""].filter(Boolean).join(" ");
      group.rows.push({ ...row, index, labelledBy: detail ? `${uid}-option-${index}-label` : null, detail: detail || null });
    });
    host.state.groups = groups;
    host.state.creatable = canCreate();
    host.state.createIndex = rows.length;
    // What a named combobox submits in single mode: the value, never the label the field shows.
    host.state.submitted = String(host.state.selected ?? (host.props.allowFreeText.value ? host.state.raw ?? "" : ""));
    host.state.message = host.props.loading.value ? "Loading suggestions…" : host.state.lookupError || "";
    const validation = host.state.validation ?? { status: "pristine", issues: [] };
    host.state.validationStatus = validation.status;
    const status = host.props.loading.value ? "Loading suggestions…" : host.state.lookupError || (host.state.expanded ? `${rows.length} suggestions available.` : "");
    host.state.statusText = `${status} ${validation.status === "pending" ? "Checking value…" : (validation.issues ?? []).map((issue) => issue.message).join(" ")}`.trim();
    if (host.state.expanded && host.state.active >= 0) input.setAttribute("aria-activedescendant", `${uid}-option-${host.state.active}`);
    else input.removeAttribute("aria-activedescendant");
    const description = [host.state.helpOpen ? `${uid}-help-text` : "", validation.issues?.length ? `${uid}-validation` : ""].filter(Boolean).join(" ");
    if (description) input.setAttribute("aria-describedby", description);
    else input.removeAttribute("aria-describedby");
    if (host.state.expanded) surface.refresh();
  };
  const onInput = (event) => {
    if (event.target !== input || composing || event.isComposing) return;
    awaitingLabel = null;
    host.state.raw = input.value;
    host.state.display = input.value;
    resetValidation();
    host.dispatch("query-change", { query: host.state.raw, display: host.state.display, trigger: "keyboard" });
    // A strict combobox keeps its committed selection while the input holds a search draft.
    // Clearing a controlled value here makes the consumer restore its label on every keystroke.
    if (host.state.selected !== null && (host.props.allowFreeText.value || host.props.allowCreate.value)) {
      commit(null, host.state.raw, null, "clear", "keyboard");
    }
    open();
    queueMicrotask(() => { if (host.props.query.value != null && host.props.query.value !== host.state.raw) syncQuery(); });
  };
  const onKeydown = (event) => {
    const item = event.target.closest?.(".item");
    if (item) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const index = Number(item.dataset.index);
      if (event.key === "ArrowLeft") { event.preventDefault(); itemButtons()[Math.max(0, index - 1)]?.focus(); }
      else if (event.key === "ArrowRight") { event.preventDefault(); index === items().length - 1 ? input.focus() : itemButtons()[index + 1]?.focus(); }
      else if (["Backspace", "Delete"].includes(event.key)) { event.preventDefault(); removeItemAt(index, "keyboard"); }
      return;
    }
    if (event.target !== input || composing || event.isComposing || host.props.disabled.value || host.props.readonly.value) return;
    if (host.props.multiple.value && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      if ((host.props.tokenSeparators.value ?? []).includes(event.key)) { event.preventDefault(); commitQuery("keyboard"); return; }
      if (!host.state.raw && (input.selectionStart ?? 0) === 0 && event.key === "ArrowLeft" && items().length) { event.preventDefault(); itemButtons().at(-1)?.focus(); return; }
      if (!host.state.raw && (input.selectionStart ?? 0) === 0 && event.key === "Backspace" && items().length) { event.preventDefault(); removeItemAt(items().length - 1, "keyboard"); return; }
    }
    if (event.key === "Escape" && host.state.expanded) { event.preventDefault(); event.stopPropagation(); close(); }
    else if (event.key === "Tab") {
      const highlighted = host.state.expanded ? (host.state.rows ?? [])[host.state.active] : undefined;
      if (host.props.selectOnTab.value && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey && highlighted && !highlighted.disabled) {
        if (host.props.multiple.value) {
          setMultiQuery("", "keyboard");
          if (!selectedSet().has(highlighted.value)) addSelectedItem(highlighted, "keyboard");
        } else {
          commit(highlighted.value, highlighted.label, asItem(highlighted), "selection", "keyboard");
          queueMicrotask(() => void validateCurrent());
        }
      } else if (!host.props.selectOnTab.value) resolveTyped("keyboard");
      close();
    }
    else if (!event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && ["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); if (!host.state.expanded) open("disclosure"); move(event.key); }
    else if (["Home", "End"].includes(event.key) && host.state.expanded && host.state.active >= 0) { event.preventDefault(); move(event.key); }
    else if (event.key === "Enter" && host.state.expanded) {
      if (host.state.active >= 0) { event.preventDefault(); choose(host.state.active, "keyboard"); }
      // With nothing highlighted, Enter commits what was typed, as a token separator does.
      else if (host.props.multiple.value && String(host.state.raw).trim()) { event.preventDefault(); commitQuery("keyboard"); }
      else if (canCreate()) { event.preventDefault(); choose((host.state.rows ?? []).length, "keyboard"); }
      else if (config().allowFreeText) { event.preventDefault(); commit(null, host.state.raw, null, "free-entry", "keyboard"); close(); }
    }
  };
  const onClick = (event) => {
    const option = event.target.closest?.('[role="option"][data-index]');
    if (option) { choose(Number(option.dataset.index), "pointer"); return; }
    const action = event.target.closest?.("[data-combobox-action]")?.dataset.comboboxAction;
    if (action && (host.props.disabled.value || host.props.readonly.value)) return;
    if (action === "clear") { lastSelection = null; commit(null, "", null, "clear", "pointer"); close(); input.focus(); }
    else if (action === "disclosure") { host.state.expanded ? close() : open("disclosure"); input.focus(); }
    else if (field.contains(event.target) && !event.target.closest?.("button")) input.focus();
  };
  const onPointerdown = (event) => { if (event.target.closest?.('[role="option"]')) event.preventDefault(); };
  const onFocusout = (event) => {
    if (event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) return;
    close();
    host.state.validation = { ...host.state.validation, touched: true };
    resolveTyped("pointer");
    if (!host.props.multiple.value && config().allowFreeText && host.state.selected === null) commit(null, host.state.raw, null, "free-entry", "keyboard");
    void validateCurrent();
  };
  const onFocusin = (event) => {
    if (event.target === input && host.props.openOnFocus.value && !host.state.expanded) open();
  };
  const onCompositionstart = (event) => { if (event.target === input) composing = true; };
  const onCompositionend = (event) => { if (event.target === input) { composing = false; onInput(new InputEvent("input")); } };
  const onTooltipOpen = (event) => { if (event.target.closest?.('[role="tooltip"]')) host.state.helpOpen = true; };
  const onTooltipClose = (event) => { if (event.target.closest?.('[role="tooltip"]')) host.state.helpOpen = false; };

  // The selection the props describe: where the combobox starts, and where a form reset returns it.
  const applyDefaults = () => {
    if (host.props.multiple.value) {
      host.state.selected = null;
      host.state.raw = host.props.query.value ?? "";
    } else {
      host.state.selected = host.props.value.value != null ? host.props.value.value : authoredDefaults()[0]?.value ?? null;
      host.state.raw = host.props.query.value ?? "";
      if (host.props.query.value == null && !host.state.raw && host.state.selected !== null) {
        host.state.raw = config().options?.find((row) => row.value === host.state.selected)?.label ?? host.state.selected;
      }
      if (host.props.query.value == null && host.state.selected !== null && host.state.raw === host.state.selected) awaitingLabel = host.state.selected;
    }
    host.state.display = host.state.raw;
  };
  applyDefaults();
  initialRaw = host.state.raw;
  host.state.validation = { status: "pristine", touched: false, dirty: false, issues: [] };
  surface = createAnchoredSurface(popup, { anchor: field, placement: "bottom-start" });

  const api = { get input() { return input; }, validate: validateCurrent };
  instances.set(element, api);
  const listeners = { input: onInput, keydown: onKeydown, click: onClick, pointerdown: onPointerdown, focusin: onFocusin, focusout: onFocusout, compositionstart: onCompositionstart, compositionend: onCompositionend, open: onTooltipOpen, close: onTooltipClose };
  for (const [name, listener] of Object.entries(listeners)) element.addEventListener(name, listener);
  // Authored options can change after mount (renamed, replaced, or arriving late). A selected value
  // then shows its current label, unless the user is editing the text.
  const relabel = () => {
    if (host.props.multiple.value || host.props.query.value != null || host.state.selected == null) return;
    if (element.ownerDocument.activeElement === input) return;
    const label = config().options?.find((row) => row.value === host.state.selected)?.label;
    if (label === undefined || label === host.state.raw) return;
    host.state.raw = label;
    host.state.display = label;
    awaitingLabel = null;
  };
  // Like a native control, a reset reports no change; the browser has already emptied the input.
  const stopReset = afterFormReset(input, () => {
    close();
    lastSelection = null;
    host.state.internalItems = controlledValues() ? itemsForValues() : Array.isArray(host.props.items.value) ? host.props.items.value : authoredDefaults();
    applyDefaults();
    input.value = host.state.display;
    resetValidation();
  });
  // Options can change while the list is open, as when a consumer adds the option it just created;
  // the open list shows them at once rather than at the next keystroke.
  const optionsKey = () => JSON.stringify((config().options ?? []).map((row) => [row.value, row.label, row.disabled, row.description, row.tag]));
  let lastOptionsKey = optionsKey();
  const observer = new MutationObserver(() => {
    relabel();
    // Controlled chips show their options' current labels, including options that arrive late.
    if (host.props.multiple.value) syncValues();
    const key = optionsKey();
    if (key === lastOptionsKey) return;
    lastOptionsKey = key;
    if (host.state.expanded) search(fullSet ? "disclosure" : "options");
  });
  observer.observe(authored, { childList: true, subtree: true, characterData: true, attributes: true });
  let lastItems = host.props.items.value;
  let lastSelectedValues = host.props.selectedValues.value;
  if (controlledValues()) host.state.internalItems = itemsForValues();
  else if (Array.isArray(lastItems)) host.state.internalItems = lastItems;
  else host.state.internalItems = authoredDefaults();
  const stop = host.effect(() => {
    // A consumer that sets `items` owns them; otherwise the component keeps its own. selectedValues wins.
    if (host.props.items.value !== lastItems) {
      lastItems = host.props.items.value;
      if (Array.isArray(lastItems) && !controlledValues()) host.state.internalItems = lastItems;
      // The list shows the selection; a consumer that adds or removes an item later (after creating
      // it, say) is reflected at once rather than at the next search.
      markSelectedRows();
    }
    if (host.props.selectedValues.value !== lastSelectedValues) { lastSelectedValues = host.props.selectedValues.value; syncValues(); }
    if (host.props.value.value !== lastValue) { lastValue = host.props.value.value; syncValue(); }
    if (host.props.query.value !== lastQuery) { lastQuery = host.props.query.value; syncQuery(); }
    if (host.props.disabled.value || host.props.readonly.value) close();
    updateView();
  });

  return () => {
    alive = false;
    stop();
    stopReset();
    observer.disconnect();
    for (const [name, listener] of Object.entries(listeners)) element.removeEventListener(name, listener);
    close();
    validationRun?.abort();
    surface.destroy();
    instances.delete(element);
  };
}
