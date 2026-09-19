export default function controller(host) {
  const surface = host.element.querySelector(".menu");
  surface?.setAttribute("popover", "manual");
  host.state.internalOpen = Boolean(host.state.open || host.state.defaultOpen);
  const syncNestedMenu = () => {
    const nestedMenu = surface?.querySelector?.("ui-menu, [data-component-root~='ui-menu']");
    if (!nestedMenu) return;
    nestedMenu.open = Boolean(host.state.internalOpen);
    if (host.state.internalOpen) {
      nestedMenu.setAttribute("data-open", "true");
      nestedMenu.setAttribute("popover", "manual");
      if (nestedMenu.showPopover && !nestedMenu.matches(":popover-open")) nestedMenu.showPopover();
    } else {
      nestedMenu.removeAttribute("data-open");
      if (nestedMenu.hidePopover && nestedMenu.matches(":popover-open")) nestedMenu.hidePopover();
    }
  };
  const sync = () => {
    if (!surface) return;
    syncNestedMenu();
    if (host.state.internalOpen && !surface.matches(":popover-open")) surface.showPopover();
    else if (!host.state.internalOpen && surface.matches(":popover-open")) surface.hidePopover();
  };
  const observer = typeof MutationObserver === "function" ? new MutationObserver(syncNestedMenu) : null;
  if (surface) observer?.observe(surface, { childList: true, subtree: true });
  const stop = host.effect(sync);
  sync();
  return () => {
    observer?.disconnect();
    stop();
  };
}
