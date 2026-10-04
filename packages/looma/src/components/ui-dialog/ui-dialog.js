import { closeDialog, closeOverlay, createIdResolver, openOverlay, requestTopOverlayClose, showDialog } from "../shared/overlay.js";

function inferredLabel(element, explicit) {
  if (String(explicit ?? "").trim()) return String(explicit).trim();
  return element.querySelector("h1, h2, h3, h4, h5, h6")?.textContent?.trim() || "Dialog";
}

/** Animates intrinsic content changes while leaving CSS in charge of the final viewport cap. */
function observeContentHeight(dialog, refs) {
  const owner = dialog.ownerDocument.defaultView;
  const motion = owner.matchMedia("(prefers-reduced-motion: reduce)");
  let lastHeight = null;
  let animation = null;
  const reset = () => {
    animation?.cancel();
    animation = null;
    lastHeight = null;
  };
  const observer = new owner.ResizeObserver(() => {
    if (!dialog.open) { reset(); return; }
    const previous = animation ? parseFloat(owner.getComputedStyle(dialog).height) : lastHeight;
    animation?.cancel();
    animation = null;
    // Cancel before measuring: auto sizing now includes the latest content and native CSS constraints.
    const style = owner.getComputedStyle(dialog);
    const next = parseFloat(style.height);
    lastHeight = next;
    if (previous === null || !Number.isFinite(previous) || !Number.isFinite(next) || Math.abs(next - previous) < 1 || motion.matches) return;
    const time = style.transitionDuration.split(",")[0].trim();
    const duration = parseFloat(time) * (time.endsWith("ms") ? 1 : 1000);
    if (!(duration > 0)) return;
    const current = dialog.animate([{ height: `${previous}px` }, { height: `${next}px` }], {
      duration, easing: style.getPropertyValue("--ui-motion-ease").trim() || "ease",
    });
    animation = current;
    current.onfinish = () => {
      if (animation !== current) return;
      animation = null;
      current.cancel();
      lastHeight = dialog.open ? parseFloat(owner.getComputedStyle(dialog).height) : null;
    };
  });
  // Observe Scroll Area's intrinsic flow wrapper, not its constrained scrolling viewport.
  // Watching the dialog or body would feed animation frames back into the resize observer.
  for (const region of [refs.header, refs.body?.firstElementChild?.firstElementChild, refs.footer]) {
    if (region) observer.observe(region);
  }
  const onMotionChange = () => {
    reset();
    if (dialog.open) lastHeight = parseFloat(owner.getComputedStyle(dialog).height);
  };
  motion.addEventListener("change", onMotionChange);
  return { reset, destroy() { reset(); observer.disconnect(); motion.removeEventListener("change", onMotionChange); } };
}

export default function controller(host) {
  const element = host.element;
  const document = element.ownerDocument;
  const dialog = element.localName === "dialog" ? element : element.querySelector("dialog");
  const overlayId = `ui-dialog-${Math.random().toString(36).slice(2, 11)}`;
  let trigger = null;
  let lastFor = "";
  let lastExternalOpen = Boolean(host.props.open.value);
  let lastOpen;
  host.state.internalOpen = lastExternalOpen;

  const requestClose = (reason, input) => {
    host.state.internalOpen = false;
    lastOpen = false;
    host.dispatch("close", { open: false, reason, trigger: input });
  };
  const closeButton = host.refs.close;
  const onCloseClick = (event) => requestClose("action", event.detail === 0 ? "keyboard" : "pointer");
  // A popover dialog does not receive native dialog command defaults in every browser.
  // Keep authored close actions equivalent in both presentation modes.
  const onActionClick = (event) => {
    if (event.defaultPrevented) return;
    const action = event.target.closest?.('button[command="close"]');
    if (!action || !dialog?.id || action.getAttribute("commandfor") !== dialog.id) return;
    event.preventDefault();
    onCloseClick(event);
  };
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
    const nextFor = String(host.props.for.value ?? "");
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
    const externalOpen = Boolean(host.props.open.value);
    if (externalOpen !== lastExternalOpen) {
      lastExternalOpen = externalOpen;
      host.state.internalOpen = externalOpen;
    }
    host.state.accessibleLabel = inferredLabel(element, host.props.label.value);
    dialog?.setAttribute("aria-label", String(host.state.accessibleLabel));
    if (host.props.alert.value) dialog?.setAttribute("role", "alertdialog");
    else dialog?.removeAttribute("role");
    syncTrigger();
    const open = Boolean(host.state.internalOpen);
    // `modeless` is a deprecated no-op: non-modal is the default. An alert dialog is always modal (APG alertdialog).
    const modal = Boolean(host.props.modal.value || host.props.alert.value);
    // An unset or unknown closedby follows native <dialog>'s auto state: closerequest when modal, none otherwise.
    const requestedClosedBy = ["any", "closerequest", "none"].includes(host.props.closedby.value) ? host.props.closedby.value : modal ? "closerequest" : "none";
    const closedBy = host.props.alert.value && requestedClosedBy === "any" ? "closerequest" : requestedClosedBy;
    trigger?.setAttribute("aria-expanded", String(open));
    if (!dialog) return;
    dialog.setAttribute("closedby", closedBy);
    if (open) {
      showDialog(dialog, modal);
      openOverlay({ id: overlayId, modal, element, modalElement: dialog, dismissible: true, canClose: (reason) => reason === "light-dismiss" ? closedBy === "any" : reason !== "escape" || closedBy !== "none", requestClose });
    } else {
      resize.reset();
      closeDialog(dialog);
      closeOverlay(document, overlayId);
    }
    if (lastOpen !== undefined && lastOpen !== open) {
      host.dispatch(open ? "open" : "close", { open, reason: "programmatic", trigger: "programmatic" });
    }
    lastOpen = open;
  };
  const onClose = (event) => {
    if (event instanceof CustomEvent || event.target !== dialog) return;
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
    const label = inferredLabel(element, host.props.label.value);
    if (label !== host.state.accessibleLabel) host.state.accessibleLabel = label;
  });
  observer.observe(element, { childList: true, subtree: true, characterData: true });
  dialog?.addEventListener("close", onClose, true);
  dialog?.addEventListener("cancel", onCancel);
  closeButton?.addEventListener("click", onCloseClick);
  element.addEventListener("keydown", onKeydown);
  document.addEventListener("click", onActionClick);
  const resize = observeContentHeight(dialog, host.refs);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop();
    ids.stop();
    observer.disconnect();
    resize.destroy();
    dialog?.removeEventListener("close", onClose, true);
    dialog?.removeEventListener("cancel", onCancel);
    closeButton?.removeEventListener("click", onCloseClick);
    trigger?.removeEventListener("click", onTriggerClick);
    element.removeEventListener("keydown", onKeydown);
    document.removeEventListener("click", onActionClick);
    closeDialog(dialog);
    closeOverlay(document, overlayId);
  };
}
