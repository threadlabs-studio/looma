function triggerFor(event) {
  if (event instanceof KeyboardEvent) return "keyboard";
  if (event instanceof MouseEvent || event instanceof PointerEvent) return "pointer";
  return "programmatic";
}

export default function controller(host) {
  const element = host.element;
  const input = element.querySelector('input[type="checkbox"]');
  let lastExternalChecked = Boolean(host.state.checked);
  host.state.internalChecked = lastExternalChecked;

  const apply = () => {
    const externalChecked = Boolean(host.state.checked);
    if (externalChecked !== lastExternalChecked) {
      lastExternalChecked = externalChecked;
      host.state.internalChecked = externalChecked;
    }
    const disabled = Boolean(host.state.disabled);
    if (!input) return;
    input.setAttribute("aria-checked", host.state.indeterminate ? "mixed" : String(Boolean(host.state.internalChecked)));
    input.checked = Boolean(host.state.internalChecked);
    input.indeterminate = Boolean(host.state.indeterminate);
    input.disabled = disabled;
    input.required = Boolean(host.state.required);
    input.value = String(host.state.value ?? "on");
  };
  const onChange = (event) => {
    if (!input) return;
    const checked = input.checked;
    host.state.internalChecked = checked;
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
