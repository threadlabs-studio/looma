import { inputSegments } from "../shared/input-segments.js";
import { externalValueTracker } from "../shared/external-value.js";

/** Retain native edits between external value changes, including the first browser connection. */
export function connect(host) {
  const input = host.element;
  const changed = externalValueTracker(input, { initialValue: host.props.value.value });
  const stopSegments = inputSegments(input, () => host.props.segments.value, () => host.props.value.value);
  const stop = host.effect(() => {
    const value = host.props.value.value;
    const replace = changed(value);
    if (value === undefined || value === null) return;
    const text = String(value);
    input.defaultValue = text;
    if (!replace || input.value === text) return;
    // A number field's text can differ from the number it means (1.0 is 1, and Chromium reads 12. as
    // 12). Writing the value would erase what the user is typing, so a field that means it stays.
    if (input.type === "number" && input.value !== "" && Number(input.value) === Number(value)) return;
    input.value = text;
  });
  return () => { stop(); stopSegments(); };
}
