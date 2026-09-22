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

  // Toasts still playing their exit animation no longer count.
  const toasts = () => Array.from(element.children).filter((child) =>
    child.classList.contains("toast") && !child.hasAttribute("data-state-closing"));
  // Auto-dismiss timers: each toast keeps its remaining time so hover/focus can pause and resume it.
  const timers = new Map();
  let paused = false;
  const startTimer = (toast) => {
    const timer = timers.get(toast);
    if (!timer || paused) return;
    timer.started = Date.now();
    timer.handle = setTimeout(() => dismissToast(toast, "timeout", "programmatic"), timer.remaining);
  };
  const pauseTimers = () => {
    if (paused) return;
    paused = true;
    for (const timer of timers.values()) {
      clearTimeout(timer.handle);
      timer.remaining = Math.max(0, timer.remaining - (Date.now() - timer.started));
    }
  };
  // Deferred: during focusout the region still matches :focus-within.
  const resumeTimers = () => setTimeout(() => {
    if (!paused || element.matches(":hover, :focus-within")) return;
    paused = false;
    for (const toast of timers.keys()) startTimer(toast);
  }, 0);
  const dismissToast = (toast, reason, trigger) => {
    clearTimeout(timers.get(toast)?.handle);
    timers.delete(toast);
    if (!toast.isConnected || toast.hasAttribute("data-state-closing")) return;
    const id = toast.id;
    // Play the exit animation, then remove. Reduced motion (no animation) removes at once; the timeout
    // guards against a missed animationend.
    toast.setAttribute("data-state-closing", "");
    const remove = () => { if (toast.isConnected) { toast.remove(); sync(); } };
    if (getComputedStyle(toast).animationName === "none") remove();
    else {
      toast.addEventListener("animationend", remove, { once: true });
      setTimeout(remove, 500);
    }
    host.dispatch("dismiss", { id, reason, trigger });
    if (toasts().length === 0) {
      host.state.internalOpen = false;
      host.dispatch("close", { open: false, reason, trigger });
    }
    sync();
  };
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
    // Stay visible while a dismissed toast finishes its exit animation.
    const leaving = element.querySelector(":scope > .toast[data-state-closing]") !== null;
    setSurfaceOpen(open || leaving);
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
    dismiss.setAttribute("size", "sm");
    dismiss.setAttribute("variant", "ghost");
    dismiss.toggleAttribute("round", true);
    toast.append(text, dismiss);
    element.append(toast);
    host.state.internalOpen = true;
    sync();
    const auto = options.auto ?? Boolean(host.state.auto);
    if (auto) {
      timers.set(toast, { remaining: Math.max(0, Number(options.duration ?? host.state.duration ?? 5000)), started: 0, handle: 0 });
      startTimer(toast);
    }
    return id;
  };
  const onClick = (event) => {
    const dismiss = event.target.closest?.(".toast__dismiss");
    const toast = dismiss?.closest?.(".toast");
    if (!toast) return;
    dismissToast(toast, "action", triggerFor(event));
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
  element.addEventListener("pointerenter", pauseTimers);
  element.addEventListener("pointerleave", resumeTimers);
  element.addEventListener("focusin", pauseTimers);
  element.addEventListener("focusout", resumeTimers);
  const stop = host.effect(sync);
  const api = { show: addToast };
  instances.set(element, api);
  sync();
  return () => {
    stop();
    observer.disconnect();
    element.removeEventListener("click", onClick);
    element.removeEventListener("command", onCommand);
    element.removeEventListener("pointerenter", pauseTimers);
    element.removeEventListener("pointerleave", resumeTimers);
    element.removeEventListener("focusin", pauseTimers);
    element.removeEventListener("focusout", resumeTimers);
    for (const timer of timers.values()) clearTimeout(timer.handle);
    timers.clear();
    setSurfaceOpen(false);
    instances.delete(element);
  };
}
