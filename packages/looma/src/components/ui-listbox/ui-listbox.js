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

export default function controller(host) {
  const element = host.element;
  const { options: authored, validity } = host.refs;
  const form = element.closest("form");
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
  const enabledIndices = () => options.filter((option) => !option.disabled).map((option) => option.index);
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
    element.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
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
    const indices = enabledIndices();
    if (!indices.length) return;
    const current = indices.indexOf(host.state.active);
    const next = key === "Home" ? indices[0]
      : key === "End" ? indices[indices.length - 1]
        : key === "ArrowDown" ? indices[(current + 1) % indices.length]
          : indices[(current <= 0 ? indices.length : current) - 1];
    activate(next);
    if (!host.props.multiple.value) choose(next, "keyboard");
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
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      move(event.key);
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      choose(host.state.active >= 0 ? host.state.active : enabledIndices()[0], "keyboard");
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
  const onReset = () => queueMicrotask(() => {
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
  form?.addEventListener("reset", onReset);
  validity.addEventListener("invalid", onInvalid);
  return () => {
    stop();
    observer.disconnect();
    authored.disabled = host.props.disabled.value;
    element.removeAttribute("data-enhanced");
    clearTimeout(typeaheadTimer);
    element.removeEventListener("click", onClick);
    element.removeEventListener("keydown", onKeydown);
    form?.removeEventListener("reset", onReset);
    validity.removeEventListener("invalid", onInvalid);
  };
}
