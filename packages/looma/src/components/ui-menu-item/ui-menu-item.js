function radioScope(item) {
  return item.closest('[role="group"]') ?? item.closest('[role="menu"]');
}

export default function controller(host) {
  const item = host.element;
  let external = Boolean(host.state.checked);
  host.state.internalChecked = external;

  const setChecked = (checked, trigger, announce) => {
    if (Boolean(host.state.internalChecked) === checked) return;
    host.state.internalChecked = checked;
    if (announce) host.dispatch("change", { checked, value: String(host.state.value ?? ""), type: String(host.state.type), trigger });
  };
  const clearOtherRadios = (trigger, announce) => {
    const scope = radioScope(item);
    if (!scope) return;
    for (const other of scope.querySelectorAll('[role="menuitemradio"]')) {
      if (other === item || radioScope(other) !== scope) continue;
      other.dispatchEvent(new CustomEvent("ui-menu-item-clear", { detail: { trigger, announce } }));
    }
  };
  const onActivate = (event) => {
    const type = String(host.state.type);
    if (host.state.disabled || type === "action") return;
    const checked = type === "radio" ? true : !host.state.internalChecked;
    if (type === "radio") clearOtherRadios(event.detail.trigger, true);
    setChecked(checked, event.detail.trigger, true);
    event.detail.checked = checked;
  };
  const onClear = (event) => setChecked(false, event.detail.trigger, event.detail.announce);
  const stop = host.effect(() => {
    const checked = Boolean(host.state.checked);
    if (checked === external) return;
    external = checked;
    if (checked && host.state.type === "radio") clearOtherRadios("programmatic", false);
    setChecked(checked, "programmatic", false);
  });
  item.addEventListener("ui-menu-item-activate", onActivate);
  item.addEventListener("ui-menu-item-clear", onClear);
  if (external && host.state.type === "radio") queueMicrotask(() => clearOtherRadios("programmatic", false));
  return () => {
    stop();
    item.removeEventListener("ui-menu-item-activate", onActivate);
    item.removeEventListener("ui-menu-item-clear", onClear);
  };
}
