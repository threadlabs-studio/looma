import { closeOverlay, createAnchoredSurface, openOverlay } from "./shared/overlay.js";

const instances = new WeakMap();

function configFor(host) {
  return host.state.config && typeof host.state.config === "object" ? host.state.config : {};
}

function formatEditingValue(raw, selection, format) {
  const unchanged = { display: raw, selection };
  if (typeof format !== "function") return unchanged;
  let result;
  try { result = format(raw, selection); } catch { return unchanged; }
  if (!result) return unchanged;
  const characters = Array.from(raw);
  let cursor = 0;
  for (const character of result.display) if (character === characters[cursor]) cursor += 1;
  if (!Number.isInteger(result.selection.start) || !Number.isInteger(result.selection.end)
    || cursor !== characters.length || result.selection.start < 0
    || result.selection.end < result.selection.start || result.selection.end > result.display.length) return unchanged;
  return result;
}

async function validateField(request, config) {
  let output = request.raw;
  let issues = [];
  const check = () => request.signal.throwIfAborted();
  try {
    check();
    if (config.parse) output = await config.parse(request.raw, request);
    check();
    if (config.schema) {
      const result = await config.schema["~standard"].validate(output);
      check();
      if (result.issues) issues = result.issues;
      else if ("value" in result) output = result.value;
    }
    if (!issues.some((issue) => issue.severity !== "warning")) {
      if (config.normalize) output = await config.normalize(output, request);
      check();
      if (config.validator) {
        const result = await config.validator(output, request);
        check();
        issues = [...issues, ...(result.issues ?? [])];
        if ("output" in result) output = result.output;
      }
    }
  } catch (error) {
    check();
    issues = [{ message: error instanceof Error ? error.message : "Unable to validate this value." }];
  }
  issues = [...issues, ...(config.issues ?? [])];
  return { output: issues.some((issue) => issue.severity !== "warning") ? undefined : output, issues };
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
  const overlayId = `ui-combobox-${Math.random().toString(36).slice(2)}`;
  let input;
  let field;
  let popup;
  let listbox;
  let itemsContainer;
  let validationElement;
  let statusElement;
  let surface;
  let lookup;
  let validationRun;
  let lookupTimer;
  let composing = false;
  let alive = true;
  let fullSet = false;
  let initialRaw = "";
  let awaitingLabel = null;
  let proposedChange;
  let formattedRaw;
  let formattedWith;
  let lastValue = host.state.value;
  let lastQuery = host.state.query;
  let lastConfig = host.state.config;
  const knownOptions = new Map();

  const config = () => configFor(host);
  const items = () => host.state.multiple && Array.isArray(host.state.value) ? host.state.value : [];
  const selectedValues = () => new Set(items().map((item) => item.value));
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
  const applyServerIssues = () => {
    const issues = config().issues ?? [];
    if (issues.length) setValidation({ issues }, host.state.validation?.touched ?? false);
    else resetValidation();
  };
  const cancelLookup = () => {
    clearTimeout(lookupTimer);
    lookup?.abort();
    lookup = undefined;
    host.state.loading = false;
  };
  const close = () => {
    host.state.expanded = false;
    host.state.active = -1;
    cancelLookup();
    surface?.hide();
    closeOverlay(document, overlayId);
  };
  const canCreate = () => {
    const current = config();
    const candidates = current.options ? [...current.options, ...(host.state.rows ?? [])] : (host.state.rows ?? []);
    return Boolean(current.allowCreate && String(host.state.raw).trim() && !host.state.loading && !host.state.lookupError
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
      if (host.state.query === undefined && awaitingLabel === host.state.selected && selectedOption) {
        host.state.raw = selectedOption.label;
        host.state.display = selectedOption.label;
        awaitingLabel = null;
        formattedRaw = undefined;
        resetValidation();
      }
      const ids = new Set();
      const selected = host.state.multiple ? selectedValues() : undefined;
      const filtered = options.filter((option) => {
        if (ids.has(option.id)) return false;
        ids.add(option.id);
        if (fullSet) return true;
        if (selected) return !selected.has(option.value) && (current.filter ? current.filter(option, query, current.context) : option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
        return current.filter ? current.filter(option, query, current.context) : current.provider ? true : option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase());
      });
      const groups = new Map();
      for (const row of filtered) {
        const group = row.group ?? "";
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push(row);
      }
      host.state.rows = [...groups.values()].flat();
      host.state.loading = false;
      host.dispatch("options-change", host.state.rows);
    };
    if (!current.provider) {
      applyOptions(current.options ?? []);
      return;
    }
    host.state.rows = [];
    host.state.loading = true;
    lookupTimer = setTimeout(async () => {
      try {
        applyOptions(await current.provider({ query, context: current.context, signal: controller.signal, reason }));
      } catch (error) {
        if (!controller.signal.aborted && alive) {
          host.state.loading = false;
          host.state.lookupError = error instanceof Error ? error.message : "Unable to load suggestions.";
        }
      }
    }, reason === "disclosure" ? 0 : Math.max(0, Number(current.debounce ?? 200)));
  };
  const open = (reason = "input") => {
    if (host.state.disabled || host.state.readOnly) return;
    host.state.expanded = true;
    if (popup && field) popup.style.minWidth = `${field.getBoundingClientRect().width}px`;
    surface?.show();
    if (popup) openOverlay({ id: overlayId, element: popup, relatedElements: [element], modal: false, requestClose: close });
    search(reason);
  };
  const format = (timing) => {
    const current = config();
    if ((current.formatOn ?? "blur") !== timing || !input) return;
    if (formattedRaw === host.state.raw && formattedWith === current.format) return;
    const result = formatEditingValue(String(host.state.raw), {
      start: input.selectionStart ?? String(host.state.raw).length,
      end: input.selectionEnd ?? String(host.state.raw).length,
      direction: input.selectionDirection ?? "none",
    }, current.format);
    formattedRaw = host.state.raw;
    formattedWith = current.format;
    host.state.display = result.display;
    if (input.value !== result.display) {
      input.value = result.display;
      input.setSelectionRange(result.selection.start, result.selection.end, result.selection.direction);
    }
  };
  const commit = (value, query, option, kind, trigger) => {
    awaitingLabel = null;
    const queryChanged = query !== host.state.raw;
    if (host.state.value === undefined) host.state.selected = value;
    if (host.state.query === undefined && queryChanged) {
      host.state.raw = query;
      host.state.display = query;
      formattedRaw = undefined;
    }
    resetValidation();
    const detail = { value, query, option, kind, trigger };
    const proposal = { value, query };
    proposedChange = proposal;
    host.dispatch("value-change", detail);
    if (queryChanged) host.dispatch("query-change", { query, display: query, trigger });
    if (kind === "create") host.dispatch("create-entry", detail);
    if (kind === "free-entry") host.dispatch("free-entry", detail);
    if (kind === "invalidation") host.dispatch("dependency-invalidate", detail);
    queueMicrotask(() => {
      if (proposedChange !== proposal) return;
      if (host.state.value !== undefined && host.state.value !== proposal.value) syncValue();
      if (host.state.query !== undefined && host.state.query !== proposal.query) syncQuery();
      proposedChange = undefined;
    });
  };
  const emitItems = (next) => host.dispatch("value-change", next);
  const setMultiQuery = (query, trigger) => {
    if (host.state.query === undefined) {
      host.state.raw = query;
      host.state.display = query;
      formattedRaw = undefined;
    }
    if (input) input.value = query;
    host.dispatch("query-change", { query, display: query, trigger });
  };
  const addSelectedItem = (option, trigger) => {
    const current = items();
    host.dispatch("add-item", { item: option, index: current.length, trigger });
    emitItems([...current, option]);
  };
  const createSelectedItem = (query, trigger) => { if (query) host.dispatch("create-item", { query, trigger }); };
  const choose = (index, trigger) => {
    const option = (host.state.rows ?? [])[index];
    if (option?.disabled) return;
    if (host.state.multiple) {
      if (option) addSelectedItem(option, trigger);
      else if (canCreate() && index === host.state.rows.length) createSelectedItem(String(host.state.raw).trim(), trigger);
      else return;
      setMultiQuery("", trigger);
    } else if (option) commit(option.value, option.label, option, "selection", trigger);
    else if (canCreate() && index === host.state.rows.length) commit(null, host.state.raw, null, "create", trigger);
    else return;
    close();
    input?.focus();
    if (!host.state.multiple && config().validateOn !== "submit") queueMicrotask(() => void validateCurrent());
  };
  const commitQuery = (trigger) => {
    const query = String(host.state.raw).trim();
    if (!query) return;
    const option = (host.state.rows ?? []).find((row) => row.label.trim().toLocaleLowerCase() === query.toLocaleLowerCase());
    if (option) { setMultiQuery("", trigger); addSelectedItem(option, trigger); }
    else if (config().allowCreate) { setMultiQuery("", trigger); createSelectedItem(query, trigger); }
  };
  const itemButtons = () => Array.from(element.querySelectorAll('[part="item"]'));
  const removeItemAt = (index, trigger) => {
    const current = items();
    const item = current[index];
    if (!item || item.disabled || host.state.disabled || host.state.readOnly) return;
    host.dispatch("remove-item", { item, index, trigger });
    emitItems(current.filter((_, position) => position !== index));
    requestAnimationFrame(() => itemButtons()[Math.min(index, itemButtons().length - 1)]?.focus?.() ?? input?.focus());
  };
  const move = (key) => {
    const rows = host.state.rows ?? [];
    const indices = rows.flatMap((row, index) => row.disabled ? [] : [index]);
    if (canCreate()) indices.push(rows.length);
    if (!indices.length) return;
    const current = indices.indexOf(host.state.active);
    const next = key === "Home" ? 0 : key === "End" ? indices.length - 1 : key === "ArrowDown" ? Math.min(current + 1, indices.length - 1) : current < 0 ? indices.length - 1 : Math.max(0, current - 1);
    host.state.active = indices[next];
    requestAnimationFrame(() => element.querySelector(`#option-${host.state.active}`)?.scrollIntoView({ block: "nearest" }));
  };
  const validateCurrent = async () => {
    validationRun?.abort();
    const run = new AbortController();
    validationRun = run;
    host.state.validation = { ...host.state.validation, status: "pending", output: undefined };
    host.dispatch("validation-change", host.state.validation);
    try {
      const current = config();
      const result = await validateField({ raw: host.state.raw, value: host.state.selected, context: current.context, signal: run.signal }, current);
      if (host.state.required && !String(host.state.raw).trim()) result.issues = [...result.issues, { message: "A value is required." }];
      else if (host.state.raw && host.state.selected === null && !current.allowFreeText && !current.allowCreate) result.issues = [...result.issues, { message: "Choose a suggestion." }];
      if (result.issues.some((issue) => issue.severity !== "warning")) result.output = undefined;
      if (!run.signal.aborted && alive) setValidation(result);
    } catch {}
    return host.state.validation;
  };
  const syncValue = () => {
    if (host.state.multiple || host.state.value === undefined) return;
    host.state.selected = host.state.value;
    if (host.state.query === undefined) {
      const proposal = proposedChange;
      const option = config().options?.find((row) => row.value === host.state.selected) ?? (host.state.selected == null ? undefined : knownOptions.get(host.state.selected));
      const nextRaw = proposal?.value === host.state.selected ? proposal.query : option?.label ?? host.state.selected ?? "";
      if (proposal?.value !== host.state.selected || nextRaw !== host.state.raw) {
        host.state.raw = nextRaw;
        host.state.display = nextRaw;
        formattedRaw = undefined;
      }
      awaitingLabel = !option && host.state.selected !== null ? host.state.selected : null;
    }
    resetValidation();
  };
  const syncQuery = () => {
    if (host.state.query === undefined || host.state.query === host.state.raw) return;
    if (host.state.value === undefined && proposedChange?.query !== host.state.query) host.state.selected = null;
    awaitingLabel = null;
    formattedRaw = undefined;
    host.state.raw = host.state.query;
    host.state.display = host.state.query;
    resetValidation();
    if (host.state.expanded) search("input");
  };
  const makeChip = (item) => {
    const projected = element.querySelector(`[slot="item-${CSS.escape(item.id)}"]`);
    if (projected) return projected;
    const chip = document.createElement("ui-chip");
    chip.setAttribute("appearance", "pill");
    chip.textContent = item.label;
    return chip;
  };
  const makeOptionContent = (row) => {
    const projected = element.querySelector(`[slot="option-${CSS.escape(row.id)}"]`);
    if (projected) return [projected];
    const primary = document.createElement("span");
    primary.className = "primary";
    primary.setAttribute("part", "option-primary");
    primary.textContent = row.label;
    if (!row.description) return [primary];
    const secondary = document.createElement("span");
    secondary.className = "secondary";
    secondary.setAttribute("part", "option-secondary");
    secondary.textContent = row.description;
    return [primary, secondary];
  };
  const renderDynamic = () => {
    if (itemsContainer) {
      itemsContainer.replaceChildren();
      items().forEach((item, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "item";
        button.setAttribute("part", "item");
        button.dataset.value = item.value;
        button.dataset.index = String(index);
        button.tabIndex = -1;
        button.disabled = Boolean(host.state.disabled || host.state.readOnly || item.disabled);
        button.setAttribute("aria-label", `${item.label}, press Delete or Backspace to remove`);
        button.append(makeChip(item));
        itemsContainer.append(button);
      });
    }
    if (listbox) {
      listbox.replaceChildren();
      const rows = host.state.rows ?? [];
      const groups = [...new Set(rows.map((row) => row.group ?? ""))];
      for (const group of groups) {
        const wrapper = document.createElement("div");
        wrapper.setAttribute("role", group ? "group" : "presentation");
        if (group) {
          wrapper.setAttribute("aria-label", group);
          const heading = document.createElement("div");
          heading.className = "group";
          heading.setAttribute("part", "group");
          heading.textContent = group;
          wrapper.append(heading);
        }
        rows.forEach((row, index) => {
          if ((row.group ?? "") !== group) return;
          const option = document.createElement("div");
          option.id = `option-${index}`;
          option.className = "option";
          option.setAttribute("part", "option");
          option.setAttribute("role", "option");
          option.setAttribute("aria-selected", String(host.state.selected === row.value));
          option.setAttribute("aria-disabled", String(Boolean(row.disabled)));
          option.toggleAttribute("data-active", host.state.active === index);
          option.dataset.index = String(index);
          option.append(...makeOptionContent(row));
          wrapper.append(option);
        });
        listbox.append(wrapper);
      }
      if (canCreate()) {
        const option = document.createElement("div");
        option.id = `option-${rows.length}`;
        option.className = "option";
        option.setAttribute("part", "option");
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", "false");
        option.toggleAttribute("data-active", host.state.active === rows.length);
        option.dataset.index = String(rows.length);
        option.textContent = `Create “${host.state.raw}”`;
        listbox.append(option);
      }
      const message = document.createElement("div");
      message.className = "message";
      if (host.state.loading) message.textContent = "Loading suggestions…";
      else if (host.state.lookupError) message.textContent = host.state.lookupError;
      else if (!rows.length && !canCreate()) message.textContent = "No suggestions.";
      if (message.textContent) listbox.append(message);
    }
    if (validationElement) {
      validationElement.replaceChildren(...(host.state.validation?.issues ?? []).map((issue) => {
        const line = document.createElement("div");
        line.textContent = issue.message;
        return line;
      }));
      validationElement.hidden = !(host.state.validation?.issues?.length);
    }
  };
  const wire = () => {
    input = element.querySelector('input[part="input"]');
    field = element.querySelector('[part="field"]');
    popup = element.querySelector('[part="popup"]');
    listbox = element.querySelector("#listbox");
    itemsContainer = element.querySelector(".items");
    validationElement = element.querySelector("#validation");
    statusElement = element.querySelector('[role="status"]');
    if (!surface && popup && field) surface = createAnchoredSurface(popup, { anchor: field, placement: "bottom-start" });
    const clearButton = Array.from(field?.querySelectorAll('button[part="affordance"]') ?? []).find((button) => button.textContent?.trim() === "×");
    const disclosureButton = field?.querySelector('button[aria-controls="listbox"]');
    if (clearButton) clearButton.dataset.comboboxAction = "clear";
    if (disclosureButton) disclosureButton.dataset.comboboxAction = "disclosure";
  };
  const render = () => {
    wire();
    const validation = host.state.validation ?? { status: "pristine", issues: [] };
    element.dataset.validation = validation.status;
    element.dataset.size = String(host.state.size ?? "md");
    const label = element.querySelector('label[part="label"]');
    if (label) {
      label.textContent = `${host.state.label ?? ""}${host.state.required ? " *" : ""}`;
      label.classList.toggle("sr-only", host.state.labelVisibility === "sr-only");
    }
    if (input) {
      if (!composing && input.value !== host.state.display) input.value = String(host.state.display ?? "");
      input.placeholder = String(host.state.placeholder ?? "");
      input.name = String(host.state.name ?? "");
      input.disabled = Boolean(host.state.disabled);
      input.readOnly = Boolean(host.state.readOnly);
      input.required = Boolean(host.state.required);
      input.setAttribute("aria-expanded", String(Boolean(host.state.expanded)));
      input.setAttribute("aria-invalid", String(validation.status === "error"));
      input.setAttribute("aria-busy", String(validation.status === "pending"));
      if (host.state.expanded && host.state.active >= 0) input.setAttribute("aria-activedescendant", `option-${host.state.active}`);
      else input.removeAttribute("aria-activedescendant");
      const description = [host.state.helpOpen ? "help-text" : "", validation.issues?.length ? "validation" : ""].filter(Boolean).join(" ");
      if (description) input.setAttribute("aria-describedby", description);
      else input.removeAttribute("aria-describedby");
    }
    if (popup) popup.hidden = !host.state.expanded;
    listbox?.setAttribute("aria-label", `${host.state.label ?? ""} suggestions`);
    listbox?.setAttribute("aria-busy", String(Boolean(host.state.loading)));
    if (statusElement) {
      const status = host.state.loading ? "Loading suggestions…" : host.state.lookupError || (host.state.expanded ? `${host.state.rows?.length ?? 0} suggestions available.` : "");
      statusElement.textContent = `${status} ${validation.status === "pending" ? "Checking value…" : (validation.issues ?? []).map((issue) => issue.message).join(" ")}`.trim();
    }
    renderDynamic();
    if (host.state.expanded) surface?.refresh();
  };
  const onInput = (event) => {
    if (event.target !== input || composing || event.isComposing) return;
    awaitingLabel = null;
    formattedRaw = undefined;
    host.state.raw = input.value;
    host.state.display = input.value;
    resetValidation();
    format("input");
    host.dispatch("query-change", { query: host.state.raw, display: host.state.display, trigger: "keyboard" });
    if (host.state.selected !== null) commit(null, host.state.raw, null, "clear", "keyboard");
    open();
    if (config().validateOn === "input") void validateCurrent();
    queueMicrotask(() => { if (host.state.query !== undefined && host.state.query !== host.state.raw) syncQuery(); });
  };
  const onKeydown = (event) => {
    const item = event.target.closest?.('[part="item"]');
    if (item) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const index = Number(item.dataset.index);
      if (event.key === "ArrowLeft") { event.preventDefault(); itemButtons()[Math.max(0, index - 1)]?.focus(); }
      else if (event.key === "ArrowRight") { event.preventDefault(); index === items().length - 1 ? input?.focus() : itemButtons()[index + 1]?.focus(); }
      else if (["Backspace", "Delete"].includes(event.key)) { event.preventDefault(); removeItemAt(index, "keyboard"); }
      return;
    }
    if (event.target !== input || composing || event.isComposing || host.state.disabled || host.state.readOnly) return;
    if (host.state.multiple && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      if ((host.state.tokenSeparators ?? []).includes(event.key)) { event.preventDefault(); commitQuery("keyboard"); return; }
      if (!host.state.raw && (input.selectionStart ?? 0) === 0 && event.key === "ArrowLeft" && items().length) { event.preventDefault(); itemButtons().at(-1)?.focus(); return; }
      if (!host.state.raw && (input.selectionStart ?? 0) === 0 && event.key === "Backspace" && items().length) { event.preventDefault(); removeItemAt(items().length - 1, "keyboard"); return; }
    }
    if (event.key === "Escape" && host.state.expanded) { event.preventDefault(); event.stopPropagation(); close(); }
    else if (event.key === "Tab") close();
    else if (!event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && ["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); if (!host.state.expanded) open("disclosure"); move(event.key); }
    else if (["Home", "End"].includes(event.key) && host.state.expanded && host.state.active >= 0) { event.preventDefault(); move(event.key); }
    else if (event.key === "Enter" && host.state.expanded) {
      if (host.state.active >= 0) { event.preventDefault(); choose(host.state.active, "keyboard"); }
      else if (config().allowFreeText) { event.preventDefault(); commit(null, host.state.raw, null, "free-entry", "keyboard"); close(); }
    }
  };
  const onClick = (event) => {
    const option = event.target.closest?.('[role="option"][data-index]');
    if (option) { choose(Number(option.dataset.index), "pointer"); return; }
    const action = event.target.closest?.("[data-combobox-action]")?.dataset.comboboxAction;
    if (action === "clear") { commit(null, "", null, "clear", "pointer"); close(); input?.focus(); }
    else if (action === "disclosure") { host.state.expanded ? close() : open("disclosure"); input?.focus(); }
    else if (field?.contains(event.target) && !event.target.closest?.("button")) input?.focus();
  };
  const onPointerdown = (event) => { if (event.target.closest?.('[role="option"]')) event.preventDefault(); };
  const onFocusout = (event) => {
    if (event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) return;
    close();
    format("blur");
    host.state.validation = { ...host.state.validation, touched: true };
    if (!host.state.multiple && config().allowFreeText && host.state.selected === null) commit(null, host.state.raw, null, "free-entry", "keyboard");
    if ((config().validateOn ?? "blur") === "blur") void validateCurrent();
  };
  const onCompositionstart = (event) => { if (event.target === input) composing = true; };
  const onCompositionend = (event) => { if (event.target === input) { composing = false; onInput(new InputEvent("input")); } };
  const onTooltipOpen = (event) => { if (event.target.closest?.('[data-component-root~="ui-tooltip"]')) host.state.helpOpen = true; };
  const onTooltipClose = (event) => { if (event.target.closest?.('[data-component-root~="ui-tooltip"]')) host.state.helpOpen = false; };

  if (host.state.multiple) {
    host.state.selected = null;
    host.state.raw = host.state.query ?? host.state.defaultQuery ?? "";
  } else {
    host.state.selected = host.state.value !== undefined ? host.state.value : host.state.defaultValue ?? null;
    host.state.raw = host.state.query ?? host.state.defaultQuery ?? "";
    if (host.state.query === undefined && !host.state.raw && host.state.selected !== null) {
      host.state.raw = config().options?.find((row) => row.value === host.state.selected)?.label ?? host.state.selected;
    }
    if (host.state.query === undefined && host.state.selected !== null && host.state.raw === host.state.selected) awaitingLabel = host.state.selected;
  }
  host.state.display = host.state.raw;
  initialRaw = host.state.raw;
  host.state.validation = { status: "pristine", touched: false, dirty: false, issues: [] };
  applyServerIssues();
  wire();

  const api = { get input() { return input; }, validate: validateCurrent };
  instances.set(element, api);
  const listeners = { input: onInput, keydown: onKeydown, click: onClick, pointerdown: onPointerdown, focusout: onFocusout, compositionstart: onCompositionstart, compositionend: onCompositionend, open: onTooltipOpen, close: onTooltipClose };
  for (const [name, listener] of Object.entries(listeners)) element.addEventListener(name, listener);
  const observer = new MutationObserver(wire);
  observer.observe(element, { childList: true, subtree: true });
  const stop = host.effect(() => {
    if (host.state.value !== lastValue) { lastValue = host.state.value; syncValue(); }
    if (host.state.query !== lastQuery) { lastQuery = host.state.query; syncQuery(); }
    if (host.state.config !== lastConfig) {
      const previous = configFor({ state: { config: lastConfig } });
      const next = config();
      lastConfig = host.state.config;
      validationRun?.abort();
      if (next.provider !== previous.provider || next.context !== previous.context) knownOptions.clear();
      if (next.context !== previous.context) {
        close();
        const policy = next.invalidation ?? "retain-query";
        if (host.state.multiple) { if (policy === "clear") setMultiQuery("", "programmatic"); }
        else commit(policy === "retain" ? host.state.selected : null, policy === "clear" ? "" : host.state.raw, null, "invalidation", "programmatic");
      }
      applyServerIssues();
      if (host.state.expanded) search("context");
    }
    if (host.state.disabled || host.state.readOnly) close();
    render();
  });
  render();

  return () => {
    alive = false;
    stop();
    observer.disconnect();
    for (const [name, listener] of Object.entries(listeners)) element.removeEventListener(name, listener);
    close();
    validationRun?.abort();
    surface?.destroy();
    instances.delete(element);
  };
}
