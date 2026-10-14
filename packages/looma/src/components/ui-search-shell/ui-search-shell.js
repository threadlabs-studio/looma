import { closeDialog, closeOverlay, openOverlay, showDialog } from "../shared/overlay.js";
import { trackTrigger } from "../shared/trigger.js";

/** Owns native dialog state while leaving query and result state to the application. */
function connect(host) {
  const dialog = host.refs.dialog;
  const document = dialog.ownerDocument;
  const overlayId = `ui-search-shell-${Math.random().toString(36).slice(2, 11)}`;
  const [trigger, stopTracking] = trackTrigger(host);
  let external = host.props.open.value;
  let activeModal = Boolean(host.props.modal.value);
  let suppressNativeClose = false;
  host.state.internalOpen = Boolean(external);

  const dispatchClose = (reason, how) => {
    if (!host.state.internalOpen) return;
    host.state.internalOpen = false;
    host.dispatch("close", { open: false, reason, trigger: how });
  };
  const closeNative = () => {
    suppressNativeClose = true;
    closeDialog(dialog);
    suppressNativeClose = false;
  };
  const stop = host.effect(() => {
    if (host.props.open.value !== external) {
      external = host.props.open.value;
      host.state.internalOpen = Boolean(external);
    }
    const modal = Boolean(host.props.modal.value);
    if (dialog.open && modal !== activeModal) closeNative();
    activeModal = modal;
    if (host.state.internalOpen && !dialog.open) {
      showDialog(dialog, modal);
    }
    if (host.state.internalOpen) {
      openOverlay({ id: overlayId, modal, element: dialog, modalElement: dialog, dismissible: false, requestClose: () => {} });
    } else {
      closeNative();
      closeOverlay(document, overlayId);
    }
  });

  const onCancel = (event) => {
    event.preventDefault();
    dispatchClose("escape", "keyboard");
  };
  const resultRows = () => Array.from(dialog.querySelectorAll(".body button[aria-current]"))
    .filter((row) => !row.disabled && !row.hidden && !row.closest("[hidden]"));
  // A search field can spend Escape clearing itself before the native dialog sees a cancel.
  const onKeydown = (event) => {
    if (event.defaultPrevented) return;
    if (event.key === "Escape") {
      event.preventDefault();
      dispatchClose("escape", "keyboard");
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const rows = resultRows();
    if (!rows.length) return;
    const target = event.target;
    const fromSearch = target.closest?.(".search") && target.matches?.("input, [role='searchbox'], [role='combobox']");
    const index = rows.indexOf(target.closest?.(".body button[aria-current]"));
    if (!fromSearch && index < 0) return;
    event.preventDefault();
    if (event.key === "Home") rows[0].focus();
    else if (event.key === "End") rows.at(-1).focus();
    else if (event.key === "ArrowDown") rows[fromSearch ? 0 : (index + 1) % rows.length].focus();
    else rows[fromSearch ? rows.length - 1 : (index - 1 + rows.length) % rows.length].focus();
  };
  const onClick = (event) => {
    if (host.props.dismissible.value && event.target === dialog) dispatchClose("light-dismiss", trigger());
  };
  // Only the dialog's own close: a tooltip, menu, or popover inside it reports "close" too, and it bubbles.
  const onClose = (event) => {
    if (event.target !== dialog) return;
    if (dialog.open) return;
    closeOverlay(document, overlayId);
    if (!suppressNativeClose && host.state.internalOpen) dispatchClose("action", trigger());
  };
  dialog.addEventListener("cancel", onCancel);
  dialog.addEventListener("keydown", onKeydown);
  dialog.addEventListener("click", onClick);
  dialog.addEventListener("close", onClose);
  return () => {
    stop();
    stopTracking();
    dialog.removeEventListener("cancel", onCancel);
    dialog.removeEventListener("keydown", onKeydown);
    dialog.removeEventListener("click", onClick);
    dialog.removeEventListener("close", onClose);
    closeNative();
    closeOverlay(document, overlayId);
  };
}

/** Keep DOM setup and its cleanup tied to each connection, including reconnects. */
export default function controller(host) {
  host.on("connect", () => connect(host));
}
