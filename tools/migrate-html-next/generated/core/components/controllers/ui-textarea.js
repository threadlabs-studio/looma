function triggerFor(event) {
  if (event instanceof KeyboardEvent) return "keyboard";
  if (event instanceof MouseEvent || event instanceof PointerEvent) return "pointer";
  return "programmatic";
}

export default function controller(host) {
  const element = host.element;
  const textarea = element.querySelector("textarea");
  if (host.state.value !== undefined) host.state.internalValue = String(host.state.value);
  const apply = () => {
    if (!textarea) return;
    if (host.state.value !== undefined) {
      host.state.internalValue = String(host.state.value);
      textarea.value = String(host.state.internalValue);
    }
    textarea.defaultValue = String(host.state.defaultValue ?? "");
    textarea.disabled = Boolean(host.state.disabled);
    textarea.readOnly = Boolean(host.state.readOnly);
    textarea.rows = Number(host.state.rows ?? 4);
    textarea.setAttribute("aria-invalid", String(Boolean(host.state.invalid)));
  };
  const emitValue = (name, event) => {
    if (!textarea) return;
    host.state.internalValue = textarea.value;
    host.dispatch(name, { value: textarea.value, trigger: triggerFor(event) });
  };
  const onInput = (event) => emitValue("input", event);
  const onChange = (event) => emitValue("change", event);
  textarea?.addEventListener("input", onInput);
  textarea?.addEventListener("change", onChange);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop();
    textarea?.removeEventListener("input", onInput);
    textarea?.removeEventListener("change", onChange);
  };
}
