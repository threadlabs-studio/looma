import { Temporal, canonicalValue } from "../shared/date-time.js";

const second = 1_000_000_000;
const dayEnd = 86400 * second - 1;
const scalar = time => time.since("00:00").total({ unit: "nanoseconds" });

/** Mark choices that cannot produce an allowed time, including overnight bounds and retained fractions. */
export function timeOptions(value, options = {}) {
  const time = Temporal.PlainTime.from(canonicalValue(value, { type: "time" }));
  const min = options.min ? scalar(Temporal.PlainTime.from(canonicalValue(options.min, { type: "time" }))) : 0;
  const max = options.max ? scalar(Temporal.PlainTime.from(canonicalValue(options.max, { type: "time" }))) : dayEnd;
  const intervals = min <= max ? [[min, max]] : [[0, max], [min, dayEnd]];
  const fraction = time.millisecond * 1_000_000 + time.microsecond * 1000 + time.nanosecond;
  const available = (begin, end, step) => intervals.some(([lower, upper]) => {
    const first = begin + Math.max(0, Math.ceil((lower - begin) / step)) * step;
    return first <= Math.min(end, upper);
  });
  const choices = (length, interval) => Array.from({ length }, (_, value) => ({ value: String(value), disabled: !available(...interval(value)) }));
  const seconds = options.showSeconds;
  return {
    hours: choices(24, hour => [hour * 3600 * second + fraction, (hour * 3600 + (seconds ? 3599 : 3540)) * second + fraction, (seconds ? 1 : 60) * second]),
    minutes: choices(60, minute => [(time.hour * 3600 + minute * 60) * second + fraction, (time.hour * 3600 + minute * 60 + (seconds ? 59 : 0)) * second + fraction, second]),
    seconds: choices(60, value => [(time.hour * 3600 + time.minute * 60 + value) * second + fraction, (time.hour * 3600 + time.minute * 60 + value) * second + fraction, second]),
  };
}
