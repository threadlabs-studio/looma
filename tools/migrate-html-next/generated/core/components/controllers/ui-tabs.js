function triggerFor(event) {
  if (event instanceof KeyboardEvent) return "keyboard";
  if (event instanceof MouseEvent || event instanceof PointerEvent) return "pointer";
  return "programmatic";
}

export default function controller(host) {
  const element = host.element;
  const tabs = () => Array.from(element.querySelectorAll('[role="tab"]'));
  host.state.internalValue = host.state.value === undefined
    ? String(host.state.defaultValue ?? "")
    : String(host.state.value);
  if (host.state.value === undefined && !host.state.internalValue) {
    const first = tabs()[0];
    host.state.internalValue = first?.id || first?.getAttribute("aria-controls") || "";
  }
  const apply = () => {
    if (host.state.value !== undefined) host.state.internalValue = String(host.state.value);
    for (const tab of tabs()) {
      const value = tab.id || tab.getAttribute("aria-controls") || "";
      const selected = value === host.state.internalValue;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const controls = tab.getAttribute("aria-controls");
      const panel = controls && (element.querySelector(`#${CSS.escape(controls)}`) || element.ownerDocument.getElementById(controls));
      if (panel) panel.hidden = !selected;
    }
  };
  const select = (tab, trigger) => {
    const value = tab.id || tab.getAttribute("aria-controls") || "";
    if (!value) return;
    const previousValue = String(host.state.internalValue || "") || undefined;
    if (host.state.value === undefined) host.state.internalValue = value;
    apply();
    host.dispatch("select", { value, previousValue, trigger });
  };
  const onClick = (event) => {
    const tab = event.target.closest?.('[role="tab"]');
    if (tab && element.contains(tab)) select(tab, triggerFor(event));
  };
  const onKeydown = (event) => {
    const tab = event.target.closest?.('[role="tab"]');
    if (!tab || !element.contains(tab)) return;
    const items = tabs();
    const index = items.indexOf(tab);
    const vertical = host.state.orientation === "vertical";
    const previous = vertical ? "ArrowUp" : "ArrowLeft";
    const next = vertical ? "ArrowDown" : "ArrowRight";
    if (event.key !== previous && event.key !== next) return;
    event.preventDefault();
    const nextIndex = event.key === next ? Math.min(index + 1, items.length - 1) : index <= 0 ? items.length - 1 : index - 1;
    const nextTab = items[nextIndex];
    if (nextTab) {
      select(nextTab, "keyboard");
      nextTab.focus();
    }
  };
  element.addEventListener("click", onClick);
  element.addEventListener("keydown", onKeydown);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop();
    element.removeEventListener("click", onClick);
    element.removeEventListener("keydown", onKeydown);
  };
}
