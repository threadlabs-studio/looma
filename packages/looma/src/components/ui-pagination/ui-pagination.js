import { trackTrigger } from "../shared/trigger.js";

/** Report page intent while leaving controlled state and native navigation with the consumer. */
export function connect(host) {
  const [takeTrigger, stopTrigger] = trackTrigger(host);
  const activate = (event) => {
    const control = event.target.closest?.("[data-pagination-page]");
    if (!control || !host.element.contains(control)) return;
    const trigger = takeTrigger();
    if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (host.props.disabled.value || control.matches(":disabled, [aria-disabled='true']")) return;
    const page = Number(control.getAttribute("data-pagination-page"));
    const previousPage = host.props.page.value;
    if (!Number.isSafeInteger(page) || page < 1 || page === previousPage) return;
    host.dispatch("navigate", { page, previousPage, trigger });
  };
  host.element.addEventListener("click", activate);
  return () => { stopTrigger(); host.element.removeEventListener("click", activate); };
}
