import { boundedNumber, calculateValue } from "../ui-number-input/arithmetic.js";
import { afterFormReset } from "../shared/form-reset.js";

export function connect(host) {
  const { range, exact } = host.refs;
  let external;
  const paint = value => {
    range.value = String(boundedNumber(value, host.props.min.value, host.props.max.value));
    host.state.current = Number(range.value);
  };
  const edit = event => {
    event.stopPropagation();
    if (host.props.disabled.value) return;
    const raw = event.currentTarget === range ? Number(range.value) : calculateValue(event.detail.value, host.props.unit.value || "");
    paint(raw); host.dispatch(event.type, { value: Number(range.value) });
  };
  for (const field of [range, exact]) for (const type of ["input", "change"]) field.addEventListener(type, edit);
  const stop = host.effect(() => {
    const signature = JSON.stringify([host.props.value.value, host.props.min.value, host.props.max.value, host.props.step.value]);
    if (external === signature) return; external = signature;
    range.min = String(Math.min(Number(host.props.min.value), Number(host.props.max.value)));
    range.max = String(Math.max(Number(host.props.min.value), Number(host.props.max.value)));
    range.step = String(Math.abs(Number(host.props.step.value)) || 1);
    range.defaultValue = String(host.props.value.value); paint(Number(host.props.value.value));
  });
  const reset = afterFormReset(range, () => paint(Number(range.defaultValue)));
  return () => { stop(); reset(); for (const field of [range, exact]) for (const type of ["input", "change"]) field.removeEventListener(type, edit); };
}
