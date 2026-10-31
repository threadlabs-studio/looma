import { Temporal, calendarWeekStart, compileDateRules, isDateAllowed, monthGrid } from "./date-time.js";
import { availableDate } from "./date-navigation.js";

const compare = Temporal.PlainDate.compare;
const inRange = (value, start, end) => Boolean(start && end && compare(value, start) >= 0 && compare(value, end) <= 0);

/** Server-safe calendar data. The caller supplies the visible month and today's civil date. */
export function calendarModel(options) {
  const { month, locale = "en-US", value = "", start = "", end = "", today = "" } = options;
  if (!/^\d{4}-\d{2}$/.test(month)) throw new RangeError("The visible month must use YYYY-MM.");
  const first = Temporal.PlainYearMonth.from(month).toPlainDate({ day: 1 });
  if (first.year < 1) throw new RangeError("Calendar years use 0001–9999, matching native date fields.");
  const rules = compileDateRules(options);
  const weekStartsOn = calendarWeekStart(locale, options.weekStartsOn);
  for (const date of [value, start, end, today, options.focusedDate].filter(Boolean)) Temporal.PlainDate.from(date);
  if (start && end && compare(start, end) > 0) throw new RangeError("Calendar range endpoints must be ordered.");
  const rows = monthGrid(month, { locale, weekStartsOn }).map(row => row.map(cell => ({
    ...cell,
    disabled: !/^\d{4}-/.test(cell.value) || cell.value.startsWith("0000-") || !isDateAllowed(cell.value, rules),
    selected: cell.value === value,
    today: cell.value === today,
    rangeStart: cell.value === start,
    rangeEnd: cell.value === end,
    inRange: inRange(cell.value, start, end),
    tabIndex: -1,
  })));
  const cells = rows.flat();
  const candidates = cells.filter(cell => !cell.outside && !cell.disabled);
  const focus = [options.focusedDate, value, start, today].map(date => candidates.find(cell => cell.value === date)).find(Boolean) ?? candidates[0];
  if (focus) focus.tabIndex = 0;
  const number = new Intl.NumberFormat(locale, { useGrouping: false });
  const english = new Intl.Locale(locale).language === "en";
  const outsideBounds = (beginning, ending) => Boolean(rules.min && compare(ending, rules.min) < 0 || rules.max && compare(beginning, rules.max) > 0);
  const hasDates = (beginning, ending) => {
    const next = availableDate(beginning.toString(), 1, rules);
    return Boolean(next && compare(next, ending) <= 0);
  };
  const monthChoice = date => ({
    value: date.toString().slice(0, 7),
    label: date.toLocaleString(locale, { month: "short", calendar: "gregory" }),
    fullLabel: date.toLocaleString(locale, { month: "long", calendar: "gregory" }),
    current: date.month === first.month,
    outsideBounds: outsideBounds(date, date.with({ day: date.daysInMonth })),
    disabled: !hasDates(date, date.with({ day: date.daysInMonth })),
  });
  const yearPageStart = options.yearPageStart ?? Math.floor((first.year - 1) / 12) * 12 + 1;
  if (!Number.isInteger(yearPageStart) || yearPageStart < 1 || yearPageStart > 9999) throw new RangeError("The year page must start within 0001–9999.");
  const years = Array.from({ length: Math.min(12, 10000 - yearPageStart) }, (_, offset) => {
    const year = yearPageStart + offset;
    return {
      value: year,
      label: number.format(year),
      current: year === first.year,
      outsideBounds: outsideBounds(first.with({ year, month: 1 }), first.with({ year, month: 12, day: 31 })),
      disabled: !hasDates(first.with({ year, month: 1 }), first.with({ year, month: 12, day: 31 })),
    };
  });
  return {
    month,
    title: first.toLocaleString(locale, { year: "numeric", month: "long", calendar: "gregory" }),
    monthLabel: first.toLocaleString(locale, { month: "long", calendar: "gregory" }),
    yearLabel: number.format(first.year),
    weekStartsOn,
    weekendColumns: rows[0].flatMap((cell, index) => [6, 7].includes(Temporal.PlainDate.from(cell.value).dayOfWeek) ? [index + 1] : []),
    weekdays: rows[0].map(cell => ({
      day: Temporal.PlainDate.from(cell.value).dayOfWeek,
      label: english ? ["M", "T", "W", "Th", "F", "S", "Su"][Temporal.PlainDate.from(cell.value).dayOfWeek - 1] : Temporal.PlainDate.from(cell.value).toLocaleString(locale, { weekday: "narrow", calendar: "gregory" }),
      fullLabel: Temporal.PlainDate.from(cell.value).toLocaleString(locale, { weekday: "long", calendar: "gregory" }),
    })),
    rows,
    rangeBands: rows.map(row => {
      const columns = row.flatMap((cell, index) => cell.inRange ? [index + 1] : []);
      return { start: columns[0] ?? 0, end: columns.at(-1) ?? 0 };
    }),
    focusDate: focus?.value ?? "",
    empty: !focus,
    previousMonth: month === "0001-01" ? "" : first.subtract({ months: 1 }).toString().slice(0, 7),
    nextMonth: month === "9999-12" ? "" : first.add({ months: 1 }).toString().slice(0, 7),
    months: Array.from({ length: 12 }, (_, offset) => monthChoice(first.with({ month: offset + 1 }))),
    years,
    yearPageStart,
    yearPageLabel: `${number.format(yearPageStart)}–${number.format(yearPageStart + years.length - 1)}`,
  };
}
