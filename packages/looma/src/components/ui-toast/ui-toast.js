let toastSequence = 0;

function inputFor(event) {
  return event.detail === 0 ? "keyboard" : "pointer";
}

/** An authored toast hides itself when dismissed, like a dialog closing; clearing hidden shows it again. */
function connect(host) {
  const element = host.element;
  const { action } = host.refs;
  if (!element.id) element.id = `ui-toast-authored-${++toastSequence}`;
  let remaining = Math.max(0, Number(host.props.duration.value) || 0);
  let started = 0;
  let timer = null;
  let paused = false;
  let dismissed = false;

  const dismiss = (reason, trigger) => {
    if (dismissed) return;
    dismissed = true;
    clearTimeout(timer);
    element.hidden = true;
    host.dispatch("dismiss", { id: element.id, reason, trigger });
  };
  const start = () => {
    clearTimeout(timer);
    // The duration counts only while the toast is shown; a hidden toast has nothing to time out.
    if (paused || dismissed || element.hidden || remaining <= 0) return;
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
    if (host.props.duration.value > 0 && remaining <= 0) { dismiss("timeout", "programmatic"); return; }
    start();
  };
  const onFocusOut = () => queueMicrotask(resume);
  const onClick = (event) => {
    if (event.target.closest?.(".dismiss") || action?.contains(event.target)) dismiss("action", inputFor(event));
  };
  const stop = host.effect(() => {
    const duration = Math.max(0, Number(host.props.duration.value) || 0);
    if (duration === remaining || dismissed) return;
    remaining = duration;
    start();
  });
  // Hidden by the app, the timer stops; shown (again), it is a fresh request with the full duration.
  const shown = new MutationObserver(() => {
    if (element.hidden) {
      clearTimeout(timer);
      timer = null;
      return;
    }
    dismissed = false;
    paused = false;
    remaining = Math.max(0, Number(host.props.duration.value) || 0);
    start();
  });
  shown.observe(element, { attributes: true, attributeFilter: ["hidden"] });
  element.addEventListener("click", onClick);
  element.addEventListener("pointerenter", pause);
  element.addEventListener("pointerleave", resume);
  element.addEventListener("focusin", pause);
  element.addEventListener("focusout", onFocusOut);
  start();
  return () => {
    stop();
    shown.disconnect();
    clearTimeout(timer);
    element.removeEventListener("click", onClick);
    element.removeEventListener("pointerenter", pause);
    element.removeEventListener("pointerleave", resume);
    element.removeEventListener("focusin", pause);
    element.removeEventListener("focusout", onFocusOut);
  };
}

/** Keep DOM setup and its cleanup tied to each connection, including reconnects. */
export default function controller(host) {
  host.on("connect", () => connect(host));
}
