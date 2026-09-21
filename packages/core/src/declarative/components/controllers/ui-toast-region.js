const instances = new WeakMap();
let nextToastId = 0;

function triggerFor(event) {
  if (event instanceof KeyboardEvent) return "keyboard";
  if (event instanceof MouseEvent || event instanceof PointerEvent) return "pointer";
  return "programmatic";
}

export async function show(host, message, options = {}) {
  return instances.get(host.element)?.show(message, options);
}

/** Manages toast presentation and dismissal without exposing internal selectors to authors. */
export default function controller(host) {
  const element = host.element;
  let lastExternalOpen = Boolean(host.state.open);
  host.state.internalOpen = lastExternalOpen;
  element.setAttribute("popover", "manual");
  element.dataset.uiPositioning = "viewport";

  const toasts = () => Array.from(element.children).filter((child) => child.classList.contains("toast"));
  const setSurfaceOpen = (open) => {
    element.hidden = !open;
    if (open && typeof element.showPopover === "function") {
      try { if (!element.matches(":popover-open")) element.showPopover(); } catch {}
    } else if (!open && typeof element.hidePopover === "function") {
      try { if (element.matches(":popover-open")) element.hidePopover(); } catch {}
    }
  };
  const sync = () => {
    const externalOpen = Boolean(host.state.open);
    if (externalOpen !== lastExternalOpen) {
      lastExternalOpen = externalOpen;
      host.state.internalOpen = externalOpen;
    }
    const open = Boolean(host.state.internalOpen) && toasts().length > 0;
    setSurfaceOpen(open);
  };
  const addToast = (message, options = {}) => {
    const toast = element.ownerDocument.createElement("div");
    const text = element.ownerDocument.createElement("span");
    const dismiss = element.ownerDocument.createElement("ui-icon-button");
    const id = String(options.id || `ui-toast-${++nextToastId}`);
    toast.id = id;
    toast.className = "toast";
    toast.setAttribute("role", options.tone === "danger" ? "alert" : "status");
    if (options.tone) toast.dataset.tone = String(options.tone);
    text.className = "toast__message";
    text.textContent = String(message);
    dismiss.className = "toast__dismiss";
    dismiss.setAttribute("label", `Dismiss ${String(message).toLocaleLowerCase()}`);
    dismiss.textContent = "×";
    toast.append(text, dismiss);
    element.append(toast);
    host.state.internalOpen = true;
    sync();
    return id;
  };
  const onClick = (event) => {
    const dismiss = event.target.closest?.(".toast__dismiss");
    const toast = dismiss?.closest?.(".toast");
    if (!toast) return;
    const trigger = triggerFor(event);
    const id = toast.id;
    toast.remove();
    host.dispatch("dismiss", { id, reason: "action", trigger });
    if (toasts().length === 0) {
      host.state.internalOpen = false;
      host.dispatch("close", { open: false, reason: "action", trigger });
    }
    sync();
  };
  const onCommand = (event) => {
    if (event.command !== "--show-toast") return;
    const message = event.source?.value || host.state.message || "Notification";
    addToast(message);
  };

  const observer = new MutationObserver(sync);
  observer.observe(element, { childList: true });
  element.addEventListener("click", onClick);
  element.addEventListener("command", onCommand);
  const stop = host.effect(sync);
  const api = { show: addToast };
  instances.set(element, api);
  sync();
  return () => {
    stop();
    observer.disconnect();
    element.removeEventListener("click", onClick);
    element.removeEventListener("command", onCommand);
    setSurfaceOpen(false);
    instances.delete(element);
  };
}
