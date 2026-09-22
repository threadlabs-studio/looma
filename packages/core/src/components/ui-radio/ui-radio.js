import { trackTrigger } from "../shared/trigger.js";

// `checked` sets the control initially and whenever it changes; the user's changes update the state.
export default function controller(host) {
  const input = host.refs.input;
  const [trigger, stopTracking] = trackTrigger(host);
  let external = host.state.checked;
  host.state.internalChecked = Boolean(external);
  const stop = host.effect(() => {
    if (host.state.checked === external) return;
    external = host.state.checked;
    host.state.internalChecked = Boolean(external);
  });
  const onChange = () => {
    host.state.internalChecked = input.checked;
    if (!input.checked) return;
    host.dispatch("change", { checked: input.checked, value: String(host.state.value ?? "on"), trigger: trigger() });
  };
  input.addEventListener("change", onChange);
  return () => {
    stop();
    stopTracking();
    input.removeEventListener("change", onChange);
  };
}
