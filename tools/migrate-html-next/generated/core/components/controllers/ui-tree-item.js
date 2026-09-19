// HTML Next controller for the tree item's controlled/uncontrolled expansion surface. Structural
// drag/drop coordination remains a later controller-conversion slice; this preserves the rendered
// state and the component-owned disclosure interaction used by the migration corpus.

function setFlag(element, name, present) {
  if (present) element.setAttribute(name, "");
  else element.removeAttribute(name);
}

export default function controller(host) {
  const element = host.element;
  const children = element.querySelector(".children");
  const disclosure = element.querySelector(".disclosure");
  let internalExpanded = Boolean(host.state.expanded ?? host.state.defaultExpanded);

  const expanded = () => host.state.expanded === undefined
    ? internalExpanded
    : Boolean(host.state.expanded);

  const apply = () => {
    const container = Boolean(host.state.container);
    const disabled = Boolean(host.state.disabled);
    const open = container && expanded();
    setFlag(element, "data-container", container);
    setFlag(element, "data-selected", Boolean(host.state.selected));
    setFlag(element, "data-disabled", disabled);
    element.setAttribute("aria-selected", String(Boolean(host.state.selected)));
    if (container) element.setAttribute("aria-expanded", String(open));
    else element.removeAttribute("aria-expanded");
    if (children) children.hidden = !open;
    if (disclosure) {
      disclosure.disabled = disabled;
      disclosure.setAttribute("aria-expanded", String(open));
    }
  };

  const onDisclosure = (event) => {
    event.stopPropagation();
    if (!host.state.container || host.state.disabled) return;
    const next = !expanded();
    if (host.state.expanded === undefined) internalExpanded = next;
    apply();
    host.dispatch?.("expand", { id: host.state.itemId || "", expanded: next, trigger: "pointer" });
  };

  disclosure?.addEventListener?.("click", onDisclosure);
  const stop = host.effect(apply);
  apply();

  return () => {
    stop?.();
    disclosure?.removeEventListener?.("click", onDisclosure);
  };
}
