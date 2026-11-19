import { trackTrigger } from "../shared/trigger.js";

/** Report dismissal intent without changing the consumer-owned visibility or message. */
export function connect(host) {
  const [takeTrigger, stopTrigger] = trackTrigger(host);
  const dismiss = (event) => {
    const control = event.target.closest?.(".dismiss");
    if (!control || control.parentElement !== host.element || !host.props.dismissible.value || event.defaultPrevented) return;
    host.dispatch("dismiss", { reason: "action", trigger: takeTrigger() });
  };
  host.element.addEventListener("click", dismiss);
  return () => { stopTrigger(); host.element.removeEventListener("click", dismiss); };
}
