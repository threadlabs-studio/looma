import { announceOverlayOpen } from "../shared/overlay.js";
import { trackTrigger } from "../shared/trigger.js";

let toastIds = 0;

/**
 * Shows the region while it has authored or generated messages. Generated messages dismiss by
 * action or timeout; authored ui-toast children hide themselves, and a hidden one does not count.
 */
function connect(host) {
  const element = host.element;
  const [trigger, stopTracking] = trackTrigger(host);
  const toasts = () => host.state.toasts ?? [];
  const authored = () => Array.from(element.children).some((child) => !child.classList.contains("toast") && !child.hidden);
  let announcedVisible = false;
  const sync = () => {
    const visible = authored() || toasts().length > 0;
    if (visible && !announcedVisible) announceOverlayOpen(element.ownerDocument, element);
    announcedVisible = visible;
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
    const tone = ["neutral", "info", "success", "warning", "danger"].includes(options.tone) ? options.tone : "neutral";
    host.state.toasts = [...toasts(), { id, message: String(message), tone, role: tone === "danger" ? "alert" : "status", closing: false }];
    const duration = Math.max(0, Number(options.duration ?? host.props.duration.value ?? 0));
    if (duration > 0) {
      timers.set(id, { remaining: duration, started: 0, handle: 0 });
      startTimer(id);
    }
    return id;
  };

  const onClick = (event) => {
    const id = event.target.closest?.("[data-toast]")?.dataset.toast;
    if (id) dismiss(id, "action", trigger());
  };
  const onCommand = (event) => {
    if (event.target === element && event.command === "--show-toast" && event.source?.value) add(event.source.value);
  };
  const onShowToast = (event) => {
    if (event.target === element && typeof event.detail?.message === "string") add(event.detail.message, event.detail);
  };
  const stop = host.effect(sync);
  const observer = new MutationObserver(sync);
  observer.observe(element, { childList: true, subtree: true, attributeFilter: ["hidden"] });
  element.addEventListener("click", onClick);
  element.addEventListener("command", onCommand);
  element.addEventListener("show-toast", onShowToast);
  element.addEventListener("pointerenter", pauseTimers);
  element.addEventListener("pointerleave", resumeTimers);
  element.addEventListener("focusin", pauseTimers);
  element.addEventListener("focusout", resumeTimers);
  return () => {
    stop();
    stopTracking();
    observer.disconnect();
    element.removeEventListener("click", onClick);
    element.removeEventListener("command", onCommand);
    element.removeEventListener("show-toast", onShowToast);
    element.removeEventListener("pointerenter", pauseTimers);
    element.removeEventListener("pointerleave", resumeTimers);
    element.removeEventListener("focusin", pauseTimers);
    element.removeEventListener("focusout", resumeTimers);
    for (const timer of timers.values()) clearTimeout(timer.handle);
    timers.clear();
    if (element.matches(":popover-open")) element.hidePopover();
  };
}

/** Keep DOM setup and its cleanup tied to each connection, including reconnects. */
export default function controller(host) {
  host.on("connect", () => connect(host));
}
