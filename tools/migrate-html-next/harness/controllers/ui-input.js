function triggerFor(event) {
  if (event instanceof KeyboardEvent) return "keyboard";
  if (event instanceof MouseEvent || event instanceof PointerEvent) return "pointer";
  return "programmatic";
}

export default function controller(host) {
  const element = host.element;
  const input = element.querySelector("input");
  if (host.state.value !== undefined) host.state.internalValue = String(host.state.value);
  const apply = () => {
    if (!input) return;
    const controlled = host.state.value !== undefined;
    if (controlled) {
      host.state.internalValue = String(host.state.value);
      input.value = String(host.state.internalValue);
    }
    input.defaultValue = String(host.state.defaultValue ?? "");
    input.disabled = Boolean(host.state.disabled);
    input.readOnly = Boolean(host.state.readOnly);
    input.setAttribute("aria-invalid", String(Boolean(host.state.invalid)));
    element.toggleAttribute("data-invalid", Boolean(host.state.invalid));
  };
  const emitValue = (name, event) => {
    if (!input) return;
    host.state.internalValue = input.value;
    host.dispatch(name, { value: input.value, trigger: triggerFor(event) });
  };
  const onInput = (event) => emitValue("input", event);
  const onChange = (event) => emitValue("change", event);
  input?.addEventListener("input", onInput);
  input?.addEventListener("change", onChange);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop();
    input?.removeEventListener("input", onInput);
    input?.removeEventListener("change", onChange);
  };
}
