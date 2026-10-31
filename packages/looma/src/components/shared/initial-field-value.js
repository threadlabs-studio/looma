import { canonicalValue, parseInput } from "./date-time.js";

/** Read an enhanced field's canonical submission, or the usable native draft awaiting enhancement. */
export function initialFieldValue(field, options) {
  const editor = field.querySelector("[data-date-editor]");
  const fallback = field.querySelector("[data-date-fallback]");
  if (!editor.hidden && editor.value !== "") return field.querySelector("[data-date-value]").value;
  const control = editor.hidden ? fallback : editor;
  if (control.validity.badInput) return undefined;
  try {
    if (control.value === "") canonicalValue(field.querySelector("[data-date-value]").value, options);
    return parseInput(control.value, options);
  } catch { return undefined; }
}
