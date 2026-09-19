function inferredLabel(element, explicit) {
  if (explicit) return explicit;
  return element.querySelector("[slot='title'], h1, h2, h3, h4, h5, h6")?.textContent?.trim() || "Dialog";
}

export default function controller(host) {
  const dialog = host.element.querySelector("dialog");
  host.state.accessibleLabel = inferredLabel(host.element, host.state.label);
  host.state.internalOpen = Boolean(host.state.open ?? host.state.defaultOpen);

  const syncOpen = () => {
    if (!dialog) return;
    if (host.state.internalOpen && !dialog.open) dialog.showModal();
    else if (!host.state.internalOpen && dialog.open) dialog.close();
  };
  const stop = host.effect(syncOpen);
  const onClose = () => {
    if (host.state.open === undefined) host.state.internalOpen = false;
    host.dispatch("close", { open: false, reason: "programmatic", trigger: "programmatic" });
  };
  dialog?.addEventListener("close", onClose);
  syncOpen();
  return () => {
    stop();
    dialog?.removeEventListener("close", onClose);
  };
}
