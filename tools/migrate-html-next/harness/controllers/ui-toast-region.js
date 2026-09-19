function triggerFor(event) {
  if (event instanceof KeyboardEvent) return "keyboard";
  if (event instanceof MouseEvent || event instanceof PointerEvent) return "pointer";
  return "programmatic";
}

export default function controller(host) {
  const element = host.element;
  let pendingDismiss = null;
  element.setAttribute("popover", "manual");
  element.dataset.uiPositioning = "viewport";
  const toasts = () => Array.from(element.querySelectorAll("[data-ui-toast]"));
  const setSurfaceOpen = (open) => {
    element.hidden = !open;
    if (open && typeof element.showPopover === "function") {
      try { if (!element.matches(":popover-open")) element.showPopover(); } catch {}
    } else if (!open && typeof element.hidePopover === "function") {
      try { if (element.matches(":popover-open")) element.hidePopover(); } catch {}
    }
  };
  const sync = () => {
    const open = Boolean(host.state.open) && toasts().length > 0;
    const wasOpen = Boolean(host.state.internalOpen);
    const completed = pendingDismiss && !element.contains(pendingDismiss.toast) ? pendingDismiss : null;
    host.state.internalOpen = open;
    element.toggleAttribute("data-open", open);
    setSurfaceOpen(open);
    if (wasOpen && !open && completed) {
      host.dispatch("close", { open: false, reason: "action", trigger: completed.trigger });
    }
    if (completed || !host.state.open) pendingDismiss = null;
  };
  const onClick = (event) => {
    const dismiss = event.target.closest?.("[data-ui-toast-dismiss]");
    const toast = dismiss?.closest?.("[data-ui-toast]");
    if (!toast) return;
    const trigger = triggerFor(event);
    pendingDismiss = { toast, trigger };
    host.dispatch("dismiss", { id: toast.id || "", reason: "action", trigger });
  };
  const observer = new MutationObserver(sync);
  observer.observe(element, { childList: true, subtree: true });
  element.addEventListener("click", onClick);
  const stop = host.effect(sync);
  sync();
  return () => {
    stop();
    observer.disconnect();
    element.removeEventListener("click", onClick);
    setSurfaceOpen(false);
  };
}
