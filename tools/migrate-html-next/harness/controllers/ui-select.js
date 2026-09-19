function triggerFor(event) {
  if (event instanceof KeyboardEvent) return "keyboard";
  if (event instanceof MouseEvent || event instanceof PointerEvent) return "pointer";
  return "programmatic";
}

export default function controller(host) {
  const element = host.element;
  const select = element.querySelector("select");
  let initialized = false;
  if (host.state.value !== undefined) host.state.internalValue = String(host.state.value);
  const apply = () => {
    if (!select) return;
    if (host.state.value !== undefined) {
      host.state.internalValue = String(host.state.value);
      select.value = String(host.state.internalValue);
    } else if (!initialized && host.state.defaultValue !== undefined) {
      select.value = String(host.state.defaultValue);
    }
    initialized = true;
    select.disabled = Boolean(host.state.disabled);
    select.required = Boolean(host.state.required);
    select.setAttribute("aria-invalid", String(Boolean(host.state.invalid)));
    element.toggleAttribute("data-invalid", Boolean(host.state.invalid));
  };
  const emitValue = (name, event) => {
    if (!select) return;
    host.state.internalValue = select.value;
    host.dispatch(name, { value: select.value, trigger: triggerFor(event) });
  };
  const onInput = (event) => emitValue("input", event);
  const onChange = (event) => emitValue("change", event);
  select?.addEventListener("input", onInput);
  select?.addEventListener("change", onChange);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop();
    select?.removeEventListener("input", onInput);
    select?.removeEventListener("change", onChange);
  };
}
