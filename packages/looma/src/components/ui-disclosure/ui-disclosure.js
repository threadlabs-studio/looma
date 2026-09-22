import { trackTrigger } from "../shared/trigger.js";

let disclosures = 0;

// `open` sets the disclosure initially and whenever it changes; the trigger toggles the state.
export default function controller(host) {
  const [trigger, stopTracking] = trackTrigger(host);
  host.state.contentId = `ui-disclosure-${++disclosures}`;
  let external = host.state.open;
  host.state.internalOpen = Boolean(external);
  const stop = host.effect(() => {
    if (host.state.open === external) return;
    external = host.state.open;
    host.state.internalOpen = Boolean(external);
  });
  const onClick = () => {
    if (host.state.disabled) return;
    const open = !host.state.internalOpen;
    host.state.internalOpen = open;
    host.dispatch(open ? "open" : "close", { open, reason: "action", trigger: trigger() });
  };
  host.refs.trigger.addEventListener("click", onClick);
  return () => {
    stop();
    stopTracking();
    host.refs.trigger.removeEventListener("click", onClick);
  };
}
