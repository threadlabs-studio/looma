let toastSequence = 0;

function inputFor(event) {
  return event.detail === 0 ? "keyboard" : "pointer";
}

/** Authored toasts request dismissal; their consumer owns removal from the rendered list. */
export default function controller(host) {
  const element = host.element;
  const { action } = host.refs;
  if (!element.id) element.id = `ui-toast-authored-${++toastSequence}`;
  let remaining = Math.max(0, Number(host.state.duration) || 0);
  let started = 0;
  let timer = null;
  let paused = false;
  let dismissed = false;

  const dismiss = (reason, trigger) => {
    if (dismissed) return;
    dismissed = true;
    clearTimeout(timer);
    host.dispatch("dismiss", { id: element.id, reason, trigger });
  };
  const start = () => {
    clearTimeout(timer);
    if (paused || dismissed || remaining <= 0) return;
    started = Date.now();
    timer = setTimeout(() => dismiss("timeout", "programmatic"), remaining);
  };
  const pause = () => {
    if (paused) return;
    paused = true;
    if (timer !== null) remaining = Math.max(0, remaining - (Date.now() - started));
    clearTimeout(timer);
    timer = null;
  };
  const resume = () => {
    if (!paused || element.matches(":hover, :focus-within")) return;
    paused = false;
    if (host.state.duration > 0 && remaining <= 0) { dismiss("timeout", "programmatic"); return; }
    start();
  };
  const onFocusOut = () => queueMicrotask(resume);
  const onClick = (event) => {
    if (event.target.closest?.(".dismiss") || action?.contains(event.target)) dismiss("action", inputFor(event));
  };
  const stop = host.effect(() => {
    const duration = Math.max(0, Number(host.state.duration) || 0);
    if (duration === remaining || dismissed) return;
    remaining = duration;
    start();
  });
  element.addEventListener("click", onClick);
  element.addEventListener("pointerenter", pause);
  element.addEventListener("pointerleave", resume);
  element.addEventListener("focusin", pause);
  element.addEventListener("focusout", onFocusOut);
  start();
  return () => {
    stop();
    clearTimeout(timer);
    element.removeEventListener("click", onClick);
    element.removeEventListener("pointerenter", pause);
    element.removeEventListener("pointerleave", resume);
    element.removeEventListener("focusin", pause);
    element.removeEventListener("focusout", onFocusOut);
  };
}
