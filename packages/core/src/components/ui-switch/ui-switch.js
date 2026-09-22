export default function controller(host) {
  const element = host.element;
  const input = element.querySelector('input[type="checkbox"]');
  let pendingTrigger = "programmatic";
  let lastExternalChecked = Boolean(host.state.checked);
  host.state.internalChecked = lastExternalChecked;
  const apply = () => {
    const externalChecked = Boolean(host.state.checked);
    if (externalChecked !== lastExternalChecked) {
      lastExternalChecked = externalChecked;
      host.state.internalChecked = externalChecked;
    }
    const checked = Boolean(host.state.internalChecked);
    const disabled = Boolean(host.state.disabled);
    if (!input) return;
    input.setAttribute("role", "switch");
    input.setAttribute("aria-checked", String(checked));
    input.checked = checked;
    input.disabled = disabled;
    input.required = Boolean(host.state.required);
    input.value = String(host.state.value ?? "on");
  };
  const onChange = (event) => {
    if (!input) return;
    const checked = input.checked;
    host.state.internalChecked = checked;
    host.dispatch("change", {
      checked,
      value: String(host.state.value ?? "on"),
      trigger: pendingTrigger,
    });
    pendingTrigger = "programmatic";
  };
  const onKeydown = (event) => {
    if (event.key === " " || event.key === "Enter") pendingTrigger = "keyboard";
  };
  const onPointerdown = () => { pendingTrigger = "pointer"; };
  input?.addEventListener("change", onChange);
  input?.addEventListener("keydown", onKeydown);
  input?.addEventListener("pointerdown", onPointerdown);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop();
    input?.removeEventListener("change", onChange);
    input?.removeEventListener("keydown", onKeydown);
    input?.removeEventListener("pointerdown", onPointerdown);
  };
}
