import { closeOverlay, openOverlay, requestTopOverlayClose } from "./shared/overlay.js";

function inferredLabel(element, explicit) {
  if (String(explicit ?? "").trim()) return String(explicit).trim();
  return element.querySelector('[slot="heading"], [data-ui-dialog-title], h1, h2, h3, h4, h5, h6')?.textContent?.trim() || "Dialog";
}

export default function controller(host) {
  const element = host.element;
  const document = element.ownerDocument;
  const dialog = element.querySelector("dialog");
  const overlayId = `ui-dialog-${Math.random().toString(36).slice(2, 11)}`;
  host.state.internalOpen = host.state.open === undefined ? Boolean(host.state.defaultOpen) : Boolean(host.state.open);

  const requestClose = (reason, trigger) => {
    if (host.state.open === undefined) host.state.internalOpen = false;
    host.dispatch("close", { open: false, reason, trigger });
  };
  const apply = () => {
    if (host.state.open !== undefined) host.state.internalOpen = Boolean(host.state.open);
    host.state.accessibleLabel = inferredLabel(element, host.state.label);
    dialog?.setAttribute("aria-label", String(host.state.accessibleLabel));
    const open = Boolean(host.state.internalOpen);
    if (!dialog) return;
    if (open) {
      if (!dialog.open) {
        if (host.state.modal) dialog.showModal();
        else dialog.show();
      }
      openOverlay({ id: overlayId, modal: Boolean(host.state.modal), element, dismissible: Boolean(host.state.dismissible), requestClose });
    } else {
      if (dialog.open) dialog.close();
      closeOverlay(document, overlayId);
    }
  };
  const onClose = () => {
    if (!host.state.internalOpen) return;
    if (host.state.open === undefined) {
      host.state.internalOpen = false;
      closeOverlay(document, overlayId);
    } else requestAnimationFrame(apply);
    host.dispatch("close", { open: false, reason: "programmatic", trigger: "programmatic" });
  };
  const onKeydown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      requestTopOverlayClose(document, "escape", "keyboard");
    }
  };
  const onCancel = (event) => {
    event.preventDefault();
    requestTopOverlayClose(document, "escape", "keyboard");
  };
  const observer = new MutationObserver(() => {
    const label = inferredLabel(element, host.state.label);
    if (label !== host.state.accessibleLabel) host.state.accessibleLabel = label;
  });
  observer.observe(element, { childList: true, subtree: true, characterData: true });
  dialog?.addEventListener("close", onClose);
  dialog?.addEventListener("cancel", onCancel);
  element.addEventListener("keydown", onKeydown);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop();
    observer.disconnect();
    dialog?.removeEventListener("close", onClose);
    dialog?.removeEventListener("cancel", onCancel);
    element.removeEventListener("keydown", onKeydown);
    closeOverlay(document, overlayId);
  };
}
