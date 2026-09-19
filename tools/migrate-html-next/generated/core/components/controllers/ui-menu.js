export default function controller(host) {
  const element = host.element;
  element.setAttribute("popover", "manual");
  host.state.internalOpen = Boolean(host.state.open ?? host.state.defaultOpen);
  const stopControlledSync = host.effect(() => {
    if (host.state.open !== undefined) host.state.internalOpen = Boolean(host.state.open);
  });
  const sync = () => {
    if (host.state.internalOpen && !element.matches(":popover-open")) element.showPopover();
    else if (!host.state.internalOpen && element.matches(":popover-open")) element.hidePopover();
  };
  const stop = host.effect(sync);
  sync();
  return () => {
    stopControlledSync();
    stop();
  };
}
