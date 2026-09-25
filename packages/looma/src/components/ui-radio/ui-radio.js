import { afterFormReset } from "../shared/form-reset.js";
import { trackTrigger } from "../shared/trigger.js";

// `checked` sets the control initially and whenever it changes; the user's changes update the state.
// A form reset returns the control to `checked`. Vue writes the checked attribute on every render, so
// the native default alone cannot hold it there.
export default function controller(host) {
  const input = host.refs.input;
  const [trigger, stopTracking] = trackTrigger(host);
  let external = host.state.checked;
  host.state.internalChecked = Boolean(external);
  const stop = host.effect(() => {
    input.defaultChecked = Boolean(host.state.checked);
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
  const stopReset = afterFormReset(input, () => {
    // Inside a ui-radio-group the group's value decides, whichever reset runs first.
    if (input.closest('[role="radiogroup"]')) return;
    host.state.internalChecked = Boolean(external);
    input.checked = Boolean(external);
  });
  return () => {
    stop();
    stopReset();
    stopTracking();
    input.removeEventListener("change", onChange);
  };
}
