function hasContent(region) {
  if (region?.querySelector(":scope > [data-slotted]")) return true;
  return [...(region?.childNodes ?? [])].some((node) => (
    node.nodeType === Node.TEXT_NODE
      ? Boolean(node.textContent?.trim())
      : node.nodeType === Node.ELEMENT_NODE && node.localName !== "slot"
  ));
}

function triggerFor(event) {
  if (event instanceof KeyboardEvent) return "keyboard";
  if (event instanceof MouseEvent || event instanceof PointerEvent) return "pointer";
  return "programmatic";
}

/** Owns native dialog state while leaving query and result state to the application. */
export default function controller(host) {
  const element = host.element;
  const dialog = element.querySelector("dialog");
  const status = element.querySelector(".search-shell__status");
  const footer = element.querySelector(".search-shell__footer");
  let lastExternalOpen = Boolean(host.state.open);
  let activeModal = Boolean(host.state.modal);
  let suppressNativeClose = false;
  host.state.internalOpen = lastExternalOpen;

  const dispatchClose = (reason, trigger) => {
    if (!host.state.internalOpen) return;
    host.state.internalOpen = false;
    host.dispatch("close", { open: false, reason, trigger });
  };

  const syncRegions = () => {
    if (status) status.hidden = !hasContent(status);
    if (footer) footer.hidden = !hasContent(footer);
  };

  const closeNative = () => {
    if (!dialog?.open) return;
    suppressNativeClose = true;
    dialog.close();
    suppressNativeClose = false;
  };

  const apply = () => {
    const externalOpen = Boolean(host.state.open);
    if (externalOpen !== lastExternalOpen) {
      lastExternalOpen = externalOpen;
      host.state.internalOpen = externalOpen;
    }
    const modal = Boolean(host.state.modal);
    if (dialog?.open && modal !== activeModal) closeNative();
    activeModal = modal;
    element.setAttribute("data-open", String(Boolean(host.state.internalOpen)));
    dialog?.setAttribute("aria-label", String(host.state.label || "Search"));
    if (!dialog) return;
    if (host.state.internalOpen && !dialog.open) {
      if (modal) dialog.showModal();
      else dialog.show();
    } else if (!host.state.internalOpen) {
      closeNative();
    }
  };

  const onCancel = (event) => {
    event.preventDefault();
    if (host.state.dismissible) dispatchClose("escape", "keyboard");
  };
  const onClick = (event) => {
    if (host.state.dismissible && event.target === dialog) {
      dispatchClose("light-dismiss", triggerFor(event));
    }
  };
  const onClose = (event) => {
    if (!suppressNativeClose && host.state.internalOpen) dispatchClose("action", triggerFor(event));
  };

  // Projection can settle after the controller connects. Observe the whole
  // lowered root so moving an authored node into either region is visible even
  // when the move begins outside that region.
  const observer = new MutationObserver(syncRegions);
  observer.observe(element, { childList: true, subtree: true });
  dialog?.addEventListener("cancel", onCancel);
  dialog?.addEventListener("click", onClick);
  dialog?.addEventListener("close", onClose);
  syncRegions();
  const settledFrame = requestAnimationFrame(syncRegions);
  const stop = host.effect(apply);
  apply();

  return () => {
    stop?.();
    cancelAnimationFrame(settledFrame);
    observer.disconnect();
    dialog?.removeEventListener("cancel", onCancel);
    dialog?.removeEventListener("click", onClick);
    dialog?.removeEventListener("close", onClose);
    closeNative();
  };
}
