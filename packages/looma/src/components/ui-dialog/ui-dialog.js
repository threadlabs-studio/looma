import { closeOverlay, createIdResolver, openOverlay, requestTopOverlayClose } from "../shared/overlay.js";

function inferredLabel(element, explicit) {
  if (String(explicit ?? "").trim()) return String(explicit).trim();
  return element.querySelector("h1, h2, h3, h4, h5, h6")?.textContent?.trim() || "Dialog";
}

export default function controller(host) {
  const element = host.element;
  const document = element.ownerDocument;
  const dialog = element.localName === "dialog" ? element : element.querySelector("dialog");
  const overlayId = `ui-dialog-${Math.random().toString(36).slice(2, 11)}`;
  let trigger = null;
  let lastFor = "";
  let lastExternalOpen = Boolean(host.state.open);
  let lastOpen;
  host.state.internalOpen = lastExternalOpen;

  const requestClose = (reason, input) => {
    host.state.internalOpen = false;
    lastOpen = false;
    host.dispatch("close", { open: false, reason, trigger: input });
  };
  const closeButton = host.refs.close;
  const onCloseClick = (event) => requestClose("action", event.detail === 0 ? "keyboard" : "pointer");
  const onTriggerClick = (event) => {
    if (host.state.internalOpen) return;
    host.state.internalOpen = true;
    lastOpen = true;
    host.dispatch("open", { open: true, reason: "action", trigger: event.detail === 0 ? "keyboard" : "pointer" });
  };
  const ids = createIdResolver(document, () => {
    lastFor = null;
    apply();
  });
  const syncTrigger = () => {
    const nextFor = String(host.state.for ?? "");
    if (nextFor === lastFor) return;
    lastFor = nextFor;
    trigger?.removeEventListener("click", onTriggerClick);
    trigger = ids.get(nextFor);
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
    if (host.state.alert) dialog?.setAttribute("role", "alertdialog");
    else dialog?.removeAttribute("role");
    syncTrigger();
    const open = Boolean(host.state.internalOpen);
    // `modeless` is a deprecated no-op: non-modal is the default. An alert dialog is always modal (APG alertdialog).
    const modal = Boolean(host.state.modal || host.state.alert);
    // An unset or unknown closedby follows native <dialog>'s auto state: closerequest when modal, none otherwise.
    const requestedClosedBy = ["any", "closerequest", "none"].includes(host.state.closedby) ? host.state.closedby : modal ? "closerequest" : "none";
    const closedBy = host.state.alert && requestedClosedBy === "any" ? "closerequest" : requestedClosedBy;
    trigger?.setAttribute("aria-expanded", String(open));
    if (!dialog) return;
    dialog.setAttribute("closedby", closedBy);
    if (open) {
      if (dialog.open && dialog.matches(":modal") !== modal) dialog.close();
      if (!dialog.open) {
        if (modal) dialog.showModal();
        else dialog.show();
      }
      openOverlay({ id: overlayId, modal, element, dismissible: true, canClose: (reason) => reason === "light-dismiss" ? closedBy === "any" : reason !== "escape" || closedBy !== "none", requestClose });
    } else {
      if (dialog.open) dialog.close();
      closeOverlay(document, overlayId);
    }
    if (lastOpen !== undefined && lastOpen !== open) {
      host.dispatch(open ? "open" : "close", { open, reason: "programmatic", trigger: "programmatic" });
    }
    lastOpen = open;
  };
  const onClose = (event) => {
    if (event instanceof CustomEvent) return;
    // Consumers receive one Looma close event with a reason, not an additional native close event.
    event.stopImmediatePropagation();
    if (dialog.open || !host.state.internalOpen) return;
    host.state.internalOpen = false;
    lastOpen = false;
    closeOverlay(document, overlayId);
    host.dispatch("close", { open: false, reason: "programmatic", trigger: "programmatic" });
  };
  const onKeydown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
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
  dialog?.addEventListener("close", onClose, true);
  dialog?.addEventListener("cancel", onCancel);
  closeButton?.addEventListener("click", onCloseClick);
  element.addEventListener("keydown", onKeydown);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop();
    ids.stop();
    observer.disconnect();
    dialog?.removeEventListener("close", onClose, true);
    dialog?.removeEventListener("cancel", onCancel);
    closeButton?.removeEventListener("click", onCloseClick);
    trigger?.removeEventListener("click", onTriggerClick);
    element.removeEventListener("keydown", onKeydown);
    closeOverlay(document, overlayId);
  };
}
