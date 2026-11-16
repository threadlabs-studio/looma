import { cancelActiveItemReveal, revealActiveItem } from "../shared/active-item-reveal.js";
import { collectionNavigationKeys, enabledOptionIndices, nextActiveIndex } from "../shared/collection-navigation.js";
import { afterFormReset } from "../shared/form-reset.js";
let nextId = 0;

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

// Authored options remain the source of labels, order, disabled state, and default selections.
function readOptions(container) {
  return Array.from(container.querySelectorAll("option"), (option, index) => ({
    value: option.value,
    label: option.label || option.textContent?.trim() || option.value,
    disabled: option.disabled || Boolean(option.closest("optgroup[disabled]")),
    selected: option.hasAttribute("selected"),
    index,
  }));
}

export function connect(host) {
  const element = host.element;
  const { options: authored, validity } = host.refs;
  host.state.uid = `ui-listbox-${++nextId}`;
  if (element.id && !element.hasAttribute("aria-label") && !element.hasAttribute("aria-labelledby")) {
    const label = Array.from(element.ownerDocument.querySelectorAll("label[for]")).find((candidate) => candidate.htmlFor === element.id);
    if (label) {
      label.id ||= `${host.state.uid}-label`;
      element.setAttribute("aria-labelledby", label.id);
    }
  }
  let options = [];
  let initial = [];
  let initialized = false;
  let external = "";
  let typeahead = "";
  let typeaheadTimer;

  const selected = () => Array.isArray(host.state.selection) ? host.state.selection : [];
  const externallySelected = () => host.props.multiple.value
    ? (Array.isArray(host.props.values.value) ? Array.from(new Set(host.props.values.value.map(String))) : null)
    : (host.props.value.value === undefined || host.props.value.value === null ? null : [String(host.props.value.value)]);
  const defaultSelection = () => externallySelected()
    ?? options.filter((option) => option.selected).map((option) => option.value).slice(0, host.props.multiple.value ? undefined : 1);
  const render = () => {
    const set = new Set(selected());
    const rows = options.map((option) => ({
      value: option.value,
      label: option.label,
      disabled: option.disabled,
      selected: set.has(option.value),
      index: option.index,
    }));
    if (!same(host.state.choices, rows)) host.state.choices = rows;
    const active = host.state.active;
    if (active < 0 || !options[active] || options[active].disabled) element.removeAttribute("aria-activedescendant");
    else element.setAttribute("aria-activedescendant", `${host.state.uid}-option-${active}`);
  };
  const setSelection = (values, trigger) => {
    const next = Array.from(new Set(values.map(String)));
    if (same(selected(), next)) return;
    host.state.selection = next;
    host.state.hasSelection = next.some((value) => value !== "");
    host.state.validationError = false;
    render();
    if (trigger) host.dispatch("change", { value: next[0] ?? null, values: next, trigger });
  };
  const syncOptions = () => {
    const next = readOptions(authored);
    if (same(options, next) && initialized) return;
    const hadOptions = options.length > 0;
    options = next;
    if (!initialized || (!hadOptions && options.length && !selected().length)) {
      initial = defaultSelection();
      host.state.selection = initial;
      host.state.hasSelection = initial.some((value) => value !== "");
      initialized = true;
    }
    render();
  };
  const activate = (index) => {
    if (index < 0 || options[index]?.disabled || !options[index]) return;
    host.state.active = index;
    render();
    revealActiveItem(element, () => element.querySelector(`[data-index="${host.state.active}"]`));
  };
  const choose = (index, trigger) => {
    const option = options[index];
    if (!option || option.disabled || host.props.disabled.value) return;
    activate(index);
    if (host.props.multiple.value) {
      const current = selected();
      setSelection(current.includes(option.value)
        ? current.filter((value) => value !== option.value)
        : options.filter((candidate) => current.includes(candidate.value) || candidate.value === option.value).map((candidate) => candidate.value), trigger);
    } else setSelection([option.value], trigger);
  };
  const move = (key) => {
    const next = nextActiveIndex(enabledOptionIndices(options), host.state.active, key, { wrap: true });
    if (next < 0) return;
    if (host.props.multiple.value) activate(next);
    else choose(next, "keyboard");
  };
  const onClick = (event) => {
    if (host.props.disabled.value) return;
    const row = event.target.closest("[data-index]");
    if (!row || !element.contains(row)) return;
    element.focus();
    choose(Number(row.dataset.index), "pointer");
  };
  const onKeydown = (event) => {
    if (host.props.disabled.value || event.altKey || event.metaKey || event.ctrlKey) return;
    if (collectionNavigationKeys.includes(event.key)) {
      event.preventDefault();
      move(event.key);
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      choose(host.state.active >= 0 ? host.state.active : enabledOptionIndices(options)[0], "keyboard");
    } else if (event.key.length === 1 && !event.shiftKey) {
      typeahead += event.key.toLocaleLowerCase();
      clearTimeout(typeaheadTimer);
      typeaheadTimer = setTimeout(() => { typeahead = ""; }, 700);
      const match = options.find((option) => !option.disabled && option.label.toLocaleLowerCase().startsWith(typeahead));
      if (match) {
        activate(match.index);
        if (!host.props.multiple.value) choose(match.index, "keyboard");
      }
    }
  };
  const stopReset = afterFormReset(validity, () => {
    setSelection(initial);
    host.state.validationError = false;
  });
  const onInvalid = (event) => {
    event.preventDefault();
    host.state.validationError = true;
    requestAnimationFrame(() => element.focus());
  };

  const observer = new MutationObserver(syncOptions);
  observer.observe(authored, { childList: true, subtree: true, attributes: true, attributeFilter: ["selected", "disabled", "value", "label"] });
  syncOptions();
  authored.disabled = true;
  element.setAttribute("data-enhanced", "");
  const stop = host.effect(() => {
    const signature = JSON.stringify([host.props.multiple.value, host.props.value.value, host.props.values.value]);
    if (signature !== external) {
      external = signature;
      initial = defaultSelection();
      setSelection(initial);
    }
    render();
  });
  element.addEventListener("click", onClick);
  element.addEventListener("keydown", onKeydown);
  validity.addEventListener("invalid", onInvalid);
  return () => {
    cancelActiveItemReveal(element);
    stop();
    observer.disconnect();
    authored.disabled = host.props.disabled.value;
    element.removeAttribute("data-enhanced");
    clearTimeout(typeaheadTimer);
    element.removeEventListener("click", onClick);
    element.removeEventListener("keydown", onKeydown);
    stopReset();
    validity.removeEventListener("invalid", onInvalid);
  };
}
