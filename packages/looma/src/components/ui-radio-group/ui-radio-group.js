import { afterFormReset } from "../shared/form-reset.js";
import { checkRadio, connectRadioGroup } from "../shared/radio-group.js";
import { trackTrigger } from "../shared/trigger.js";

let groups = 0;

// Native radios that share a name already move and check with the arrow keys. The group gives its
// radios that name, applies a controlled value, and reports the user's choice. Its fieldset disables
// them, so a radio's own disabled is never overwritten.
export default function controller(host) {
  const element = host.element;
  const name = String(host.props.name.value || `ui-radio-group-${++groups}`);
  const [trigger, stopTracking] = trackTrigger(host);
  const inputs = () => Array.from(element.querySelectorAll('input[type="radio"]'));
  let external = host.props.value.value;
  // A radio's own required survives until the group's required changes, since either one makes the
  // whole name group required.
  let required = false;
  const apply = (input, value = host.state.internalValue) => {
    if (required) input.required = true;
    input.name = name;
    checkRadio(input, input.value === value);
    // The value prop is the choice a native form reset returns to.
    input.defaultChecked = input.value === String(external ?? "");
  };
  const stopGroup = connectRadioGroup(element, apply);
  host.state.internalValue = String(external ?? "");
  const stop = host.effect(() => {
    if (host.props.value.value !== external) {
      external = host.props.value.value;
      host.state.internalValue = String(external ?? "");
    }
    const value = host.state.internalValue;
    const applyRequired = Boolean(host.props.required.value) !== required;
    required = Boolean(host.props.required.value);
    for (const input of inputs()) {
      if (applyRequired) input.required = required;
      apply(input, value);
    }
  });
  const onChange = (event) => {
    const input = event.target;
    if (input?.type !== "radio" || !input.checked || input.value === host.state.internalValue) return;
    const previousValue = host.state.internalValue;
    host.state.internalValue = input.value;
    const how = trigger();
    host.dispatch("select", { value: input.value, previousValue, trigger: how });
    host.dispatch("change", { checked: true, value: input.value, trigger: how });
  };
  element.addEventListener("change", onChange);
  const stopReset = afterFormReset(element, () => {
    host.state.internalValue = String(external ?? "");
    for (const input of inputs()) checkRadio(input, input.value === host.state.internalValue);
  });
  return () => {
    stop();
    stopGroup();
    stopReset();
    stopTracking();
    element.removeEventListener("change", onChange);
  };
}
