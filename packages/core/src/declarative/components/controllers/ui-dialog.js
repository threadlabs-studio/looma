import { closeOverlay, openOverlay, requestTopOverlayClose } from "./shared/overlay.js";
import { readNativeProperty } from "./shared/native-control.js";

function inferredLabel(element, explicit) {
  if (String(explicit ?? "").trim()) return String(explicit).trim();
  return element.querySelector('[slot="heading"], [data-ui-dialog-title], h1, h2, h3, h4, h5, h6')?.textContent?.trim() || "Dialog";
}

export default function controller(host) {
  const element = host.element;
  const document = element.ownerDocument;
  const dialog = element.localName === "dialog" ? element : element.querySelector("dialog");
  const overlayId = `ui-dialog-${Math.random().toString(36).slice(2, 11)}`;
  let trigger = null;
  let lastFor = "";
  let lastExternalOpen = Boolean(host.state.open);
  host.state.internalOpen = lastExternalOpen;

  const requestClose = (reason, input) => {
    host.state.internalOpen = false;
    host.dispatch("close", { open: false, reason, trigger: input });
  };
  const onTriggerClick = () => {
    host.state.internalOpen = true;
  };
  const syncTrigger = () => {
    const nextFor = String(host.state.for ?? "");
    if (nextFor === lastFor) return;
    lastFor = nextFor;
    trigger?.removeEventListener("click", onTriggerClick);
    trigger = nextFor ? document.getElementById(nextFor) : null;
    if (dialog && !dialog.id) dialog.id = `${overlayId}-surface`;
    trigger?.addEventListener("click", onTriggerClick);
    if (trigger) {
      trigger.setAttribute("aria-haspopup", "dialog");
      trigger.setAttribute("aria-controls", dialog?.id || "");
    }
  };
  const apply = () => {
    const externalOpen = Boolean(host.state.open);
    if (externalOpen !== lastExternalOpen) {
      lastExternalOpen = externalOpen;
      host.state.internalOpen = externalOpen;
    }
    host.state.accessibleLabel = inferredLabel(element, host.state.label);
    dialog?.setAttribute("aria-label", String(host.state.accessibleLabel));
    syncTrigger();
    const open = Boolean(host.state.internalOpen);
    trigger?.setAttribute("aria-expanded", String(open));
    if (!dialog) return;
    if (open) {
      if (!readNativeProperty(dialog, "open")) {
        if (host.state.modal) dialog.showModal();
        else dialog.show();
      }
      openOverlay({ id: overlayId, modal: Boolean(host.state.modal), element, dismissible: Boolean(host.state.dismissible), requestClose });
    } else {
      if (readNativeProperty(dialog, "open")) dialog.close();
      closeOverlay(document, overlayId);
    }
  };
  const onClose = () => {
    if (!host.state.internalOpen) return;
    host.state.internalOpen = false;
    closeOverlay(document, overlayId);
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
    trigger?.removeEventListener("click", onTriggerClick);
    element.removeEventListener("keydown", onKeydown);
    closeOverlay(document, overlayId);
  };
}
