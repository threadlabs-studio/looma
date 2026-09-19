function triggerFor(event) {
  if (event instanceof KeyboardEvent) return "keyboard";
  if (event instanceof MouseEvent || event instanceof PointerEvent) return "pointer";
  return "programmatic";
}

export default function controller(host) {
  const element = host.element;
  const groupName = String(host.state.name || `ui-radio-group-${Math.random().toString(36).slice(2, 9)}`);
  const radios = () => Array.from(element.querySelectorAll('[data-component-root~="ui-radio"]'));
  host.state.internalValue = String(host.state.value ?? "");
  let lastValue = host.state.value;
  const apply = () => {
    if (host.state.value !== lastValue) {
      lastValue = host.state.value;
      host.state.internalValue = String(host.state.value ?? "");
    }
    const disabled = Boolean(host.state.disabled);
    const current = String(host.state.internalValue ?? "");
    const items = radios();
    const selectedIndex = items.findIndex((radio) => (radio.getAttribute("data-value") ?? radio.getAttribute("value") ?? "") === current);
    items.forEach((radio, index) => {
      const input = radio.querySelector('input[type="radio"]');
      const checked = (radio.getAttribute("data-value") ?? radio.getAttribute("value") ?? "") === current;
      radio.checked = checked;
      radio.name = groupName;
      radio.setAttribute("aria-checked", String(checked));
      radio.disabled = disabled;
      if (!input) return;
      input.checked = checked;
      input.name = groupName;
      input.disabled = disabled;
      input.tabIndex = index === (selectedIndex >= 0 ? selectedIndex : 0) ? 0 : -1;
    });
  };
  const setValue = (value, trigger) => {
    const previousValue = String(host.state.internalValue ?? "");
    host.state.internalValue = value;
    apply();
    host.dispatch("select", { value, previousValue, trigger });
    host.dispatch("change", { checked: true, value, trigger });
  };
  const onChange = (event) => {
    const radio = event.target.closest?.('[data-component-root~="ui-radio"]');
    const value = radio?.getAttribute("data-value") ?? radio?.getAttribute("value") ?? "";
    if (value && value !== host.state.internalValue) setValue(value, triggerFor(event));
  };
  const onKeydown = (event) => {
    const items = radios();
    if (!items.length) return;
    const current = items.findIndex((radio) => (radio.getAttribute("data-value") ?? radio.getAttribute("value") ?? "") === host.state.internalValue);
    const vertical = host.state.orientation === "vertical";
    const previous = vertical ? "ArrowUp" : "ArrowLeft";
    const next = vertical ? "ArrowDown" : "ArrowRight";
    if (event.key !== previous && event.key !== next) return;
    event.preventDefault();
    const index = event.key === next ? (current < 0 ? 0 : Math.min(current + 1, items.length - 1)) : (current <= 0 ? items.length - 1 : current - 1);
    const radio = items[index];
    const value = radio?.getAttribute("data-value") ?? radio?.getAttribute("value") ?? "";
    if (value) {
      setValue(value, "keyboard");
      radio.querySelector('input[type="radio"]')?.focus();
    }
  };
  element.addEventListener("change", onChange);
  element.addEventListener("keydown", onKeydown);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop();
    element.removeEventListener("change", onChange);
    element.removeEventListener("keydown", onKeydown);
  };
}
