import { trackTrigger } from "../shared/trigger.js";

const instances = new WeakMap();
let toastIds = 0;

export async function show(host, message, options = {}) {
  return instances.get(host.element)?.show(message, options);
}

/**
 * Shows the region while `open` is set and it has authored messages, or while any message added
 * with show() or the --show-toast command remains. Added messages dismiss by action or timeout.
 */
export default function controller(host) {
  const element = host.element;
  const [trigger, stopTracking] = trackTrigger(host);
  let external = host.state.open;
  host.state.internalOpen = Boolean(external);

  const toasts = () => host.state.toasts ?? [];
  const authored = () => Array.from(element.children).some((child) => !child.classList.contains("toast"));
  const sync = () => {
    const visible = (host.state.internalOpen && authored()) || toasts().length > 0;
    if (visible && !element.matches(":popover-open")) element.showPopover();
    else if (!visible && element.matches(":popover-open")) element.hidePopover();
  };

  // Auto-dismiss timers: each message keeps its remaining time so hover and focus pause and resume it.
  const timers = new Map();
  let paused = false;
  const startTimer = (id) => {
    const timer = timers.get(id);
    if (!timer || paused) return;
    timer.started = Date.now();
    timer.handle = setTimeout(() => dismiss(id, "timeout", "programmatic"), timer.remaining);
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
    for (const id of timers.keys()) startTimer(id);
  }, 0);

  const remove = (id) => {
    host.state.toasts = toasts().filter((toast) => toast.id !== id);
  };
  const dismiss = (id, reason, how) => {
    clearTimeout(timers.get(id)?.handle);
    timers.delete(id);
    const toast = toasts().find((candidate) => candidate.id === id);
    if (!toast || toast.closing) return;
    host.state.toasts = toasts().map((candidate) => candidate.id === id ? { ...candidate, closing: true } : candidate);
    host.dispatch("dismiss", { id, reason, trigger: how });
    if (toasts().every((candidate) => candidate.closing)) host.dispatch("close", { open: false, reason, trigger: how });
    // Removed once the exit animation ends; reduced motion has none, and the timeout guards a missed end.
    const node = element.ownerDocument.getElementById(id);
    if (!node || getComputedStyle(node).animationName === "none") remove(id);
    else {
      node.addEventListener("animationend", () => remove(id), { once: true });
      setTimeout(() => remove(id), 500);
    }
  };
  const add = (message, options = {}) => {
    const id = String(options.id || `ui-toast-${++toastIds}`);
    host.state.toasts = [...toasts(), { id, message: String(message), role: options.tone === "danger" ? "alert" : "status", closing: false }];
    if (options.auto ?? host.state.auto) {
      timers.set(id, { remaining: Math.max(0, Number(options.duration ?? host.state.duration ?? 5000)), started: 0, handle: 0 });
      startTimer(id);
    }
    return id;
  };

  const onClick = (event) => {
    const id = event.target.closest?.("[data-toast]")?.dataset.toast;
    if (id) dismiss(id, "action", trigger());
  };
  const onCommand = (event) => {
    if (event.command === "--show-toast") add(event.source?.value || host.state.message || "Notification");
  };
  const stop = host.effect(() => {
    if (host.state.open !== external) {
      external = host.state.open;
      host.state.internalOpen = Boolean(external);
    }
    sync();
  });
  const observer = new MutationObserver(sync);
  observer.observe(element, { childList: true });
  element.addEventListener("click", onClick);
  element.addEventListener("command", onCommand);
  element.addEventListener("pointerenter", pauseTimers);
  element.addEventListener("pointerleave", resumeTimers);
  element.addEventListener("focusin", pauseTimers);
  element.addEventListener("focusout", resumeTimers);
  instances.set(element, { show: add });
  return () => {
    stop();
    stopTracking();
    observer.disconnect();
    element.removeEventListener("click", onClick);
    element.removeEventListener("command", onCommand);
    element.removeEventListener("pointerenter", pauseTimers);
    element.removeEventListener("pointerleave", resumeTimers);
    element.removeEventListener("focusin", pauseTimers);
    element.removeEventListener("focusout", resumeTimers);
    for (const timer of timers.values()) clearTimeout(timer.handle);
    timers.clear();
    if (element.matches(":popover-open")) element.hidePopover();
    instances.delete(element);
  };
}
