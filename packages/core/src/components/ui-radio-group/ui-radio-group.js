import { trackTrigger } from "../shared/trigger.js";

let groups = 0;

// Native radios that share a name already move and check with the arrow keys. The group gives its
// radios that name, applies a controlled value, and reports the user's choice.
export default function controller(host) {
  const element = host.element;
  const name = String(host.state.name || `ui-radio-group-${++groups}`);
  const [trigger, stopTracking] = trackTrigger(host);
  const inputs = () => Array.from(element.querySelectorAll('[data-component~="ui-radio"] input[type="radio"]'));
  let external = host.state.value;
  host.state.internalValue = String(external ?? "");
  const stop = host.effect(() => {
    if (host.state.value !== external) {
      external = host.state.value;
      host.state.internalValue = String(external ?? "");
    }
    const value = host.state.internalValue;
    const disabled = Boolean(host.state.disabled);
    for (const input of inputs()) {
      input.name = name;
      input.checked = input.value === value;
      input.disabled = disabled;
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
  return () => {
    stop();
    stopTracking();
    element.removeEventListener("change", onChange);
  };
}
