import { Temporal, compileDateRules } from "./date-time.js";

const compare = Temporal.PlainDate.compare;
const later = (a, b) => compare(a, b) > 0 ? a : b;
const earlier = (a, b) => compare(a, b) < 0 ? a : b;

/** Find an available civil day without walking disabled years or inventing a navigation limit. */
export function availableDate(value, direction, rules = compileDateRules()) {
  if (direction !== 1 && direction !== -1) throw new RangeError("Date navigation direction must be 1 or -1.");
  if (rules.weekdays.length === 7) return null;
  const lower = Temporal.PlainDate.from(rules.min ?? "0001-01-01");
  const upper = Temporal.PlainDate.from(rules.max ?? "9999-12-31");
  const target = Temporal.PlainDate.from(value);
  const segments = rules.allowed ?? [{ start: lower.toString(), end: upper.toString() }];
  const ordered = direction === 1 ? segments : segments.toReversed();
  for (const segment of ordered) {
    const start = later(lower, Temporal.PlainDate.from(segment.start));
    const end = earlier(upper, Temporal.PlainDate.from(segment.end));
    if (compare(start, end) > 0) continue;
    let date = direction === 1 ? later(target, start) : earlier(target, end);
    while (compare(date, start) >= 0 && compare(date, end) <= 0) {
      const iso = date.toString();
      // Rules contain merged, sorted positive four-digit dates, so lexical order
      // is chronological. Binary search skips an entire unavailable interval.
      let lo = 0; let hi = rules.disabled.length;
      while (lo < hi) { const mid = (lo + hi) >>> 1; if (rules.disabled[mid].start <= iso) lo = mid + 1; else hi = mid; }
      const block = rules.disabled[lo - 1];
      if (block && block.end >= iso) {
        date = Temporal.PlainDate.from(direction === 1 ? block.end : block.start).add({ days: direction });
      } else if (rules.weekdays.includes(date.dayOfWeek)) date = date.add({ days: direction });
      else return iso;
    }
  }
  return null;
}
