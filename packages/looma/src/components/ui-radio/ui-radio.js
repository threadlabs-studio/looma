import { afterFormReset } from "../shared/form-reset.js";
import { describeInput } from "../shared/describe.js";
import { connectRadio, radioGroupOwns } from "../shared/radio-group.js";
import { trackTrigger } from "../shared/trigger.js";

// `checked` sets the control initially and whenever it changes; the user's changes update the state.
// A form reset returns the control to `checked`. Vue writes the checked attribute on every render, so
// the native default alone cannot hold it there.
function connect(host) {
  const input = host.refs.input;
  describeInput(input, host.refs.description);
  const [trigger, stopTracking] = trackTrigger(host);
  const stopRadio = connectRadio(input, (checked) => { host.state.internalChecked = checked; });
  let external = host.props.checked.value;
  if (!radioGroupOwns(input)) host.state.internalChecked = Boolean(external);
  const stop = host.effect(() => {
    const grouped = radioGroupOwns(input);
    if (!grouped) input.defaultChecked = Boolean(host.props.checked.value);
    if (host.props.checked.value === external) return;
    external = host.props.checked.value;
    if (!grouped) host.state.internalChecked = Boolean(external);
  });
  const onChange = () => {
    host.state.internalChecked = input.checked;
    if (!input.checked) return;
    host.dispatch("change", { checked: input.checked, value: String(host.props.value.value ?? "on"), trigger: trigger() });
  };
  input.addEventListener("change", onChange);
  const stopReset = afterFormReset(input, () => {
    // Inside a ui-radio-group the group's value decides, whichever reset runs first.
    if (radioGroupOwns(input)) return;
    host.state.internalChecked = Boolean(external);
    input.checked = Boolean(external);
  });
  return () => {
    stop();
    stopRadio();
    stopReset();
    stopTracking();
    input.removeEventListener("change", onChange);
  };
}

/** Keep DOM setup and its cleanup tied to each connection, including reconnects. */
export default function controller(host) {
  host.on("connect", () => connect(host));
}
