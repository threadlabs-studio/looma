import { trackTrigger } from "../shared/trigger.js";

/** Owns native dialog state while leaving query and result state to the application. */
export default function controller(host) {
  const dialog = host.refs.dialog;
  const [trigger, stopTracking] = trackTrigger(host);
  let external = host.state.open;
  let activeModal = Boolean(host.state.modal);
  let suppressNativeClose = false;
  host.state.internalOpen = Boolean(external);

  const dispatchClose = (reason, how) => {
    if (!host.state.internalOpen) return;
    host.state.internalOpen = false;
    host.dispatch("close", { open: false, reason, trigger: how });
  };
  const closeNative = () => {
    if (!dialog.open) return;
    suppressNativeClose = true;
    dialog.close();
    suppressNativeClose = false;
  };
  const stop = host.effect(() => {
    if (host.state.open !== external) {
      external = host.state.open;
      host.state.internalOpen = Boolean(external);
    }
    const modal = Boolean(host.state.modal);
    if (dialog.open && modal !== activeModal) closeNative();
    activeModal = modal;
    if (host.state.internalOpen && !dialog.open) {
      if (modal) dialog.showModal();
      else dialog.show();
    } else if (!host.state.internalOpen) {
      closeNative();
    }
  });

  const onCancel = (event) => {
    event.preventDefault();
    if (host.state.dismissible) dispatchClose("escape", "keyboard");
  };
  const onClick = (event) => {
    if (host.state.dismissible && event.target === dialog) dispatchClose("light-dismiss", trigger());
  };
  const onClose = () => {
    if (!suppressNativeClose && host.state.internalOpen) dispatchClose("action", trigger());
  };
  dialog.addEventListener("cancel", onCancel);
  dialog.addEventListener("click", onClick);
  dialog.addEventListener("close", onClose);
  return () => {
    stop();
    stopTracking();
    dialog.removeEventListener("cancel", onCancel);
    dialog.removeEventListener("click", onClick);
    dialog.removeEventListener("close", onClose);
    closeNative();
  };
}
