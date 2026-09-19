export default function controller(host) {
  const element = host.element;
  const input = element.querySelector('input[type="checkbox"]');
  host.state.internalChecked = host.state.checked === undefined
    ? Boolean(host.state.defaultChecked)
    : Boolean(host.state.checked);
  const apply = () => {
    if (host.state.checked !== undefined) host.state.internalChecked = Boolean(host.state.checked);
    const checked = Boolean(host.state.internalChecked);
    const disabled = Boolean(host.state.disabled);
    element.setAttribute("aria-checked", String(checked));
    element.setAttribute("aria-disabled", String(disabled));
    element.toggleAttribute("data-disabled", disabled);
    element.tabIndex = disabled ? -1 : 0;
    if (!input) return;
    input.checked = checked;
    input.disabled = disabled;
    input.required = Boolean(host.state.required);
    input.value = String(host.state.value ?? "on");
  };
  const toggle = (trigger) => {
    if (host.state.disabled) return;
    const checked = !Boolean(host.state.internalChecked);
    if (host.state.checked === undefined) host.state.internalChecked = checked;
    apply();
    host.dispatch("change", { checked, value: String(host.state.value ?? "on"), trigger });
  };
  const onKeydown = (event) => {
    if (event.key !== " " || host.state.disabled) return;
    event.preventDefault();
    toggle("keyboard");
  };
  const onClick = (event) => {
    if (event.target !== input) toggle("pointer");
  };
  const onChange = () => {
    if (!input) return;
    const checked = input.checked;
    if (host.state.checked === undefined) host.state.internalChecked = checked;
    host.dispatch("change", { checked, value: String(host.state.value ?? "on"), trigger: "pointer" });
    if (host.state.checked !== undefined) apply();
  };
  element.addEventListener("keydown", onKeydown);
  element.addEventListener("click", onClick);
  input?.addEventListener("change", onChange);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop();
    element.removeEventListener("keydown", onKeydown);
    element.removeEventListener("click", onClick);
    input?.removeEventListener("change", onChange);
  };
}
