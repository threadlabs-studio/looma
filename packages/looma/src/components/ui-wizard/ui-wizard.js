import { trackTrigger } from "../shared/trigger.js";

/** Report stage intent while leaving controlled state, validation and native routing with the host. */
export function connect(host) {
  const [takeTrigger, stopTrigger] = trackTrigger(host);
  const activate = (event) => {
    const control = event.target.closest?.("[data-wizard-value]");
    if (!control || !host.element.contains(control)) return;
    const trigger = takeTrigger();
    if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (host.props.disabled.value || control.matches(":disabled, [aria-disabled='true']")) return;
    const value = control.getAttribute("data-wizard-value");
    const previousValue = host.props.value.value;
    if (value === null || value === previousValue) return;
    host.dispatch("navigate", { value, previousValue, trigger });
  };
  host.element.addEventListener("click", activate);
  return () => { stopTrigger(); host.element.removeEventListener("click", activate); };
}
