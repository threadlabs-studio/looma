function radioScope(item) {
  return item.closest('[role="group"]') ?? item.closest('[role="menu"]');
}

function connect(host) {
  const item = host.element;
  let external = Boolean(host.props.checked.value);
  host.state.internalChecked = external;

  const setChecked = (checked, trigger, announce) => {
    if (Boolean(host.state.internalChecked) === checked) return;
    host.state.internalChecked = checked;
    if (announce) host.dispatch("change", { checked, value: String(host.props.value.value ?? ""), type: String(host.props.type.value), trigger });
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
    const type = String(host.props.type.value);
    if (host.props.disabled.value || type === "action") return;
    const checked = type === "radio" ? true : !host.state.internalChecked;
    if (type === "radio") clearOtherRadios(event.detail.trigger, true);
    setChecked(checked, event.detail.trigger, true);
    event.detail.checked = checked;
  };
  const onClear = (event) => setChecked(false, event.detail.trigger, event.detail.announce);
  const stop = host.effect(() => {
    const checked = Boolean(host.props.checked.value);
    if (checked === external) return;
    external = checked;
    if (checked && host.props.type.value === "radio") clearOtherRadios("programmatic", false);
    setChecked(checked, "programmatic", false);
  });
  item.addEventListener("ui-menu-item-activate", onActivate);
  item.addEventListener("ui-menu-item-clear", onClear);
  if (external && host.props.type.value === "radio") queueMicrotask(() => clearOtherRadios("programmatic", false));
  return () => {
    stop();
    item.removeEventListener("ui-menu-item-activate", onActivate);
    item.removeEventListener("ui-menu-item-clear", onClear);
  };
}

/** Keep DOM setup and its cleanup tied to each connection, including reconnects. */
export default function controller(host) {
  host.on("connect", () => connect(host));
}
