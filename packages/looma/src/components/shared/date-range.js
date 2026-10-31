import { Temporal, canonicalValue, compileDateRules, isDateAllowed } from "./date-time.js";

const compare = Temporal.PlainDate.compare;
const first = "0001-01-01";
const last = "9999-12-31";
const later = (a, b) => compare(a, b) > 0 ? a : b;
const earlier = (a, b) => compare(a, b) < 0 ? a : b;
const add = (date, days) => Temporal.PlainDate.from(date).add({ days }).toString();

function intersect(ranges, lower, upper) {
  return ranges.map(range => ({ start: later(range.start, lower), end: earlier(range.end, upper) }))
    .filter(range => compare(range.start, range.end) <= 0);
}

/** Find the contiguous selectable interval around an endpoint without walking disabled years. */
function contiguous(anchor, rules, base) {
  if (!isDateAllowed(anchor, rules)) return null;
  const segment = base.find(range => compare(range.start, anchor) <= 0 && compare(anchor, range.end) <= 0);
  if (!segment) return null;
  let { start, end } = segment;
  for (const block of rules.disabled) {
    if (compare(block.end, anchor) < 0) start = later(start, add(block.end, 1));
    else if (compare(block.start, anchor) > 0) { end = earlier(end, add(block.start, -1)); break; }
  }
  if (rules.weekdays.length) {
    for (const direction of [-1, 1]) {
      // Every excluded weekday occurs within one ISO week of an available anchor.
      for (let distance = 1; distance <= 7; distance += 1) {
        const date = Temporal.PlainDate.from(anchor).add({ days: distance * direction });
        if (!rules.weekdays.includes(date.dayOfWeek)) continue;
        if (direction < 0) start = later(start, date.add({ days: 1 }).toString());
        else end = earlier(end, date.subtract({ days: 1 }).toString());
        break;
      }
    }
  }
  return { start, end };
}

/** Project endpoint and two-click availability through the same whole-range validator's rules. */
export function rangeAvailability(range, { rules = compileDateRules(), mode = "range", anchor = "", allowUnavailableWithinRange = false } = {}) {
  const lower = rules.min || first;
  const upper = rules.max || last;
  const base = intersect(rules.allowed ?? [{ start: lower, end: upper }], lower, upper);
  const endpoint = name => {
    const opposite = range[name === "start" ? "end" : "start"];
    if (!opposite || allowUnavailableWithinRange) return base;
    try { canonicalValue(opposite); } catch { return base; }
    const segment = contiguous(opposite, rules, base);
    if (!segment) return intersect(base, name === "start" ? later(lower, add(opposite, 1)) : lower, name === "end" ? earlier(upper, add(opposite, -1)) : upper);
    return intersect(base, name === "start" ? segment.start : lower, name === "end" ? segment.end : upper);
  };
  const startRanges = endpoint("start");
  const endRanges = endpoint("end");
  let calendarRanges = mode === "start" ? startRanges : mode === "end" ? endRanges : base;
  if (mode === "range" && anchor && !allowUnavailableWithinRange) {
    const segment = contiguous(anchor, rules, base);
    calendarRanges = segment ? intersect(base, segment.start, segment.end) : [];
  }
  return { startRanges, endRanges, calendarRanges };
}
