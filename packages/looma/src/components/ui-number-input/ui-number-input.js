import { calculateValue, boundedNumber, numberText } from "./arithmetic.js";
import { afterFormReset } from "../shared/form-reset.js";

export function connect(host) {
  const input = host.element.querySelector('input');
  const decrease = host.element.querySelector('[data-number-step="decrease"]');
  const increase = host.element.querySelector('[data-number-step="increase"]');
  let current = 0;
  let external;
  let resetValue;
  const unit = () => host.props.unit.value || "";
  const normalize = value => boundedNumber(value, host.props.min.value, host.props.max.value);
  // Bind the normalized display, so a later child binding flush cannot restore the
  // raw prop (for example "51") over its calculated value with units ("51%").
  const paint = value => { current = normalize(value); input.value = numberText(current, unit()); host.state.display = input.value; input.removeAttribute("aria-invalid"); input.setCustomValidity(""); input.setAttribute("role", "spinbutton"); input.setAttribute("aria-valuenow", String(current)); input.setAttribute("aria-valuetext", input.value); input.setAttribute("aria-valuemin", String(host.props.min.value)); input.setAttribute("aria-valuemax", String(host.props.max.value)); };
  const emit = () => { const value = numberText(current, unit()); host.dispatch("input", { value }); host.dispatch("change", { value }); };
  const commit = () => {
    if (host.props.disabled.value) return;
    try { paint(calculateValue(input.value, unit())); emit(); }
    catch (error) { input.setAttribute("aria-invalid", "true"); input.setCustomValidity(error.message); }
  };
  const step = (direction, multiplier = 1) => {
    if (host.props.disabled.value) return;
    let value = current;
    try { value = calculateValue(input.value, unit()); } catch { /* Recover from an unfinished expression using the last result. */ }
    const increment = Math.abs(Number(host.props.step.value)) || 1;
    paint(value + direction * increment * multiplier); emit();
  };
  const key = event => {
    if (event.key === "Enter") { event.preventDefault(); commit(); }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); step(event.key === "ArrowUp" ? 1 : -1, event.shiftKey ? 10 : 1); }
    if (event.key === "Escape") { paint(current); }
  };
  // Do not leak unfinished expressions as accepted component values.
  const stopInput = event => event.stopPropagation();
  const down = () => step(-1); const up = () => step(1);
  input.addEventListener("input", stopInput); input.addEventListener("change", stopInput);
  input.addEventListener("keydown", key); input.addEventListener("blur", commit);
  decrease.addEventListener("click", down); increase.addEventListener("click", up);
  const stop = host.effect(() => {
    const signature = JSON.stringify([host.props.value.value, unit(), host.props.min.value, host.props.max.value]);
    if (signature === external) return; external = signature;
    try { paint(calculateValue(host.props.value.value, unit())); resetValue = input.value; input.defaultValue = resetValue; } catch { paint(current); }
  });
  const reset = afterFormReset(input, () => { try { paint(calculateValue(resetValue, unit())); } catch { paint(0); } });
  return () => { stop(); reset(); input.removeEventListener("input", stopInput); input.removeEventListener("change", stopInput); input.removeEventListener("keydown", key); input.removeEventListener("blur", commit); decrease.removeEventListener("click", down); increase.removeEventListener("click", up); };
}
