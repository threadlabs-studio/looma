function triggerFor(event) {
  if (event instanceof KeyboardEvent) return "keyboard";
  if (event instanceof MouseEvent || event instanceof PointerEvent) return "pointer";
  return "programmatic";
}

export default function controller(host) {
  const element = host.element;
  const input = element.querySelector('input[type="checkbox"]');
  host.state.internalChecked = host.state.checked === undefined
    ? Boolean(host.state.defaultChecked)
    : Boolean(host.state.checked);

  const apply = () => {
    if (host.state.checked !== undefined) host.state.internalChecked = Boolean(host.state.checked);
    const disabled = Boolean(host.state.disabled);
    element.setAttribute("aria-disabled", String(disabled));
    element.setAttribute("aria-checked", host.state.indeterminate ? "mixed" : String(Boolean(host.state.internalChecked)));
    if (!input) return;
    input.checked = Boolean(host.state.internalChecked);
    input.indeterminate = Boolean(host.state.indeterminate);
    input.disabled = disabled;
    input.required = Boolean(host.state.required);
    input.value = String(host.state.value ?? "on");
  };
  const onChange = (event) => {
    if (!input) return;
    const checked = input.checked;
    if (host.state.checked === undefined) host.state.internalChecked = checked;
    else apply();
    host.dispatch("change", { checked, value: String(host.state.value ?? "on"), trigger: triggerFor(event) });
  };
  input?.addEventListener("change", onChange);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop();
    input?.removeEventListener("change", onChange);
  };
}
