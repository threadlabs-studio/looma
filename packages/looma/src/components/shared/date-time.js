import { Temporal as TemporalFallback } from "@js-temporal/polyfill";

// Keep native Temporal when present without modifying globals in consumers or SSR.
export const Temporal = globalThis.Temporal ?? TemporalFallback;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}(?::[0-5]\d(?:\.\d{1,9})?)?$/;
const LOCAL = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::[0-5]\d(?:\.\d{1,9})?)?$/;
const clean = text => String(text).replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "").trim();
const compare = (left, right) => Temporal.PlainDate.compare(left, right);

/** Civil values never acquire an implicit zone; exact values retain all their precision. */
function readValue(value, type = "date") {
  if (typeof value !== "string") throw new RangeError("A date/time value must be a string.");
  if (type === "date" && DATE.test(value) && !value.startsWith("0000-")) return Temporal.PlainDate.from(value);
  if (type === "time" && TIME.test(value)) return Temporal.PlainTime.from(value);
  if (type === "datetime-local" && LOCAL.test(value) && !value.startsWith("0000-")) return Temporal.PlainDateTime.from(value);
  if (type === "instant") return Temporal.Instant.from(value);
  if (type === "zoned") return Temporal.ZonedDateTime.from(value);
  throw new RangeError(`Invalid ${type} value.`);
}

function serialized(value, options = {}) {
  const precision = "second" in value && value.second === 0 && value.millisecond === 0 && value.microsecond === 0 && value.nanosecond === 0
    ? { smallestUnit: "minute" } : {};
  const text = value.toString({ calendarName: "never", ...precision });
  return options.valueFormat === "space" && options.type === "datetime-local" ? text.replace("T", " ") : text;
}

/** Validate a machine binding without interpreting localized text or discarding a timestamp's zone. */
export function canonicalValue(value, options = {}) {
  return value === "" ? "" : serialized(readValue(value, options.type), options);
}

/** Normalize localized numeric entry without changing the canonical value grammar. */
export function asciiDigits(text, locale) {
  const formatter = new Intl.NumberFormat(locale, { useGrouping: false });
  let result = clean(text);
  for (let digit = 0; digit <= 9; digit++) result = result.replaceAll(clean(formatter.format(digit)), String(digit));
  // CLDR versions differ on whether Arabic locales default to Latin digits.
  // Arabic and Persian numeric paste must work with either default.
  result = result.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, digit => String(digit.codePointAt(0) % 16)).replaceAll("\u066b", ".");
  const decimal = new Intl.NumberFormat(locale).formatToParts(1.1).find(part => part.type === "decimal")?.value;
  if (decimal) result = result.replaceAll(decimal, ".");
  return result;
}

function dateOrder(locale) {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit", calendar: "gregory", timeZone: "UTC" })
    .formatToParts(new Date("2006-11-22T12:00Z")).filter(part => ["year", "month", "day"].includes(part.type)).map(part => part.type);
}

function numericDate(date, locale) {
  // Intl's numeric year drops leading zeros. A four-digit editing grammar must
  // keep them; this UTC Date is only an Intl formatting bridge, never arithmetic.
  const instant = new Date(`${date.toString()}T12:00:00Z`);
  const year = new Intl.NumberFormat(locale, { useGrouping: false, minimumIntegerDigits: 4 }).format(date.year);
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit", calendar: "gregory", timeZone: "UTC" })
    .formatToParts(instant).map(part => part.type === "year" ? year : part.value).join("");
}

function dateInput(text, locale) {
  if (DATE.test(text)) return readValue(text);
  const fields = text.match(/^(\d{1,4})[\s/.\-]+(\d{1,2})[\s/.\-]+(\d{1,4})$/);
  if (!fields) throw new RangeError("Enter a complete date using the displayed date order or YYYY-MM-DD.");
  const order = dateOrder(locale);
  const parts = Object.fromEntries(order.map((name, index) => [name, fields[index + 1]]));
  if (parts.year.length !== 4 || Number(parts.year) < 1) throw new RangeError("Enter a four-digit year from 0001 to 9999.");
  return Temporal.PlainDate.from({ year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) }, { overflow: "reject" });
}

function timeInput(text, locale, hourCycle) {
  const cycle = hourCycle ?? new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hourCycle;
  if (cycle === "h24") text = text.replace(/^24:/, "00:");
  if (TIME.test(text)) return readValue(text, "time");
  const periods = new Map([["am", "am"], ["pm", "pm"]]);
  for (const [hour, period] of [[3, "am"], [15, "pm"]]) {
    const label = new Intl.DateTimeFormat(locale, { hour: "numeric", hour12: true, timeZone: "UTC" })
      .formatToParts(new Date(`2000-01-01T${String(hour).padStart(2, "0")}:00Z`)).find(part => part.type === "dayPeriod")?.value;
    if (label) periods.set(clean(label).toLocaleLowerCase(locale), period);
  }
  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2})([.,]\d{1,9})?)?\s*(.*?)$/u);
  if (!match) throw new RangeError("Enter a complete time, such as 14:30 or 2:30 PM.");
  let hour = Number(match[1]);
  if (match[5]) {
    const period = periods.get(match[5].toLocaleLowerCase(locale));
    if (!period || hour < (cycle === "h11" ? 0 : 1) || hour > (cycle === "h11" ? 11 : 12)) throw new RangeError("Enter a valid 12-hour time and AM or PM.");
    hour = hour % 12 + (period === "pm" ? 12 : 0);
  }
  return readValue(`${String(hour).padStart(2, "0")}:${match[2]}${match[3] ? `:${match[3]}${(match[4] ?? "").replace(",", ".")}` : ""}`, "time");
}

function localInput(text, locale, hourCycle) {
  if (LOCAL.test(text)) return readValue(text, "datetime-local");
  const match = text.match(/^(.+?)[,\sT]+(\d{1,2}:\d{2}.*)$/u);
  if (!match) throw new RangeError("Enter a complete date and time.");
  return dateInput(match[1], locale).toPlainDateTime(timeInput(match[2], locale, hourCycle));
}

/** Parse only ISO or the declared locale's numeric order; never guess between competing locales. */
export function parseInput(text, options = {}) {
  text = asciiDigits(text, options.locale);
  if (!text) return "";
  const type = options.type ?? "date";
  let value;
  if (type === "date") value = dateInput(text, options.locale);
  else if (type === "time") value = timeInput(text, options.locale, options.hourCycle);
  else if (type === "datetime-local") value = localInput(text, options.locale, options.hourCycle);
  else if (type === "instant" || type === "zoned") {
    // ISO timestamps carry their own offset; an editable wall-clock draft needs an explicit zone.
    if (/\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})(?:\[.*\])?$/i.test(text)) value = readValue(text, type);
    else {
      if (!options.timeZone) throw new RangeError("An explicit time zone is required to edit an exact time.");
      const zoned = localInput(text, options.locale, options.hourCycle).toZonedDateTime(options.timeZone, { disambiguation: options.disambiguation ?? "reject" });
      // A field can show an existing zoned value through another editing zone.
      // Local typing preserves its saved zone; an explicit zoned ISO paste above
      // carries an intentional replacement zone of its own.
      value = type === "instant" ? zoned.toInstant() : options.boundTimeZone ? zoned.withTimeZone(options.boundTimeZone) : zoned;
    }
  } else throw new RangeError("Unknown date/time type.");
  return serialized(value, options);
}

/** Editable localized text keeps four-digit years and all nonzero sub-minute precision. */
export function formatInput(value, options = {}) {
  if (!value) return "";
  const type = options.type ?? "date";
  let parsed = readValue(value, type);
  if (type === "instant") {
    if (!options.timeZone) throw new RangeError("An explicit time zone is required to display an exact time.");
    parsed = parsed.toZonedDateTimeISO(options.timeZone).toPlainDateTime();
  } else if (type === "zoned") parsed = (options.timeZone ? parsed.withTimeZone(options.timeZone) : parsed).toPlainDateTime();
  const date = type === "date" ? parsed : type !== "time" ? parsed.toPlainDate() : null;
  const time = type === "time" ? parsed : type !== "date" ? parsed.toPlainTime() : null;
  const dateText = date ? numericDate(date, options.locale) : null;
  let timeText;
  if (time) {
    const settings = { hour: "numeric", minute: "2-digit", ...(options.hourCycle ? { hourCycle: options.hourCycle } : {}) };
    if (time.second || time.millisecond || time.microsecond || time.nanosecond || options.granularity === "second") settings.second = "2-digit";
    // Native Intl supports only milliseconds. Keep finer precision as ISO editable text.
    if (time.microsecond || time.nanosecond) timeText = serialized(time);
    else {
      if (time.millisecond) settings.fractionalSecondDigits = 3;
      timeText = time.toLocaleString(options.locale, settings);
    }
  }
  return dateText && timeText ? `${dateText} ${timeText}` : dateText ?? timeText;
}

/** Display formatting is independent of the numeric editing grammar and canonical binding. */
export function formatDisplay(value, options = {}) {
  if (!value || !options.displayOptions || !Object.keys(options.displayOptions).length) return formatInput(value, options);
  let parsed = readValue(value, options.type);
  if (options.type === "instant") {
    if (!options.timeZone) throw new RangeError("An explicit time zone is required to display an exact time.");
    parsed = parsed.toZonedDateTimeISO(options.timeZone);
  } else if (options.type === "zoned" && options.timeZone) parsed = parsed.withTimeZone(options.timeZone);
  return parsed.toLocaleString(options.locale, { ...options.displayOptions, calendar: "gregory" });
}

/** Typed bounds compare values of the same kind; date availability then applies in the editing zone. */
export function isValueAllowed(value, options = {}) {
  if (!value) return true;
  const type = options.type ?? "date";
  const parsed = readValue(value, type);
  const comparator = { date: Temporal.PlainDate, time: Temporal.PlainTime, "datetime-local": Temporal.PlainDateTime, instant: Temporal.Instant, zoned: Temporal.ZonedDateTime }[type];
  const min = options.min ? readValue(options.min, type) : null;
  const max = options.max ? readValue(options.max, type) : null;
  if (min && max && comparator.compare(min, max) > 0) {
    // Native time inputs have a periodic domain, so bounds may wrap midnight.
    if (type === "time") return comparator.compare(parsed, min) >= 0 || comparator.compare(parsed, max) <= 0;
    throw new RangeError("The minimum must not exceed the maximum.");
  }
  if (min && comparator.compare(parsed, min) < 0 || max && comparator.compare(parsed, max) > 0) return false;
  if (type === "time") return true;
  let date = parsed;
  if (type === "instant") {
    if (!options.timeZone) throw new RangeError("An explicit time zone is required to validate an exact time's date.");
    date = parsed.toZonedDateTimeISO(options.timeZone).toPlainDate();
  } else if (type === "zoned") date = (options.timeZone ? parsed.withTimeZone(options.timeZone) : parsed).toPlainDate();
  else if (type === "datetime-local") date = parsed.toPlainDate();
  return isDateAllowed(date.toString(), compileDateRules({ ...options, min: undefined, max: undefined }));
}

function intervals(ranges = [], dates = []) {
  const result = [...(ranges ?? []).map(range => ({ start: canonicalValue(range.start), end: canonicalValue(range.end) })), ...(dates ?? []).map(date => ({ start: canonicalValue(date), end: canonicalValue(date) }))];
  for (const range of result) if (!range.start || !range.end || compare(range.start, range.end) > 0) throw new RangeError("A date interval needs ordered, complete endpoints.");
  result.sort((left, right) => compare(left.start, right.start));
  const merged = [];
  for (const range of result) {
    const previous = merged.at(-1);
    if (previous && compare(range.start, Temporal.PlainDate.from(previous.end).add({ days: 1 })) <= 0) {
      if (compare(range.end, previous.end) > 0) previous.end = range.end;
    } else merged.push({ ...range });
  }
  return merged;
}

/** Normalize declarative restrictions once; allowed entries union, then disabled entries subtract. */
export function compileDateRules(options = {}) {
  const min = options.min ? canonicalValue(options.min) : null;
  const max = options.max ? canonicalValue(options.max) : null;
  if (min && max && compare(min, max) > 0) throw new RangeError("The minimum date must not exceed the maximum date.");
  const weekdays = [...new Set(options.disabledWeekdays ?? [])];
  if (weekdays.some(day => !Number.isInteger(day) || day < 1 || day > 7)) throw new RangeError("Weekdays use ISO numbers 1 (Monday) to 7 (Sunday).");
  return {
    min, max, weekdays,
    allowed: options.allowedDates != null || options.allowedRanges != null ? intervals(options.allowedRanges, options.allowedDates) : null,
    disabled: intervals(options.disabledRanges, options.disabledDates),
  };
}

/** Availability applies equally to typed values and calendar choices, with inclusive boundaries. */
export function isDateAllowed(value, rules = compileDateRules()) {
  const date = readValue(value);
  return !(rules.min && compare(value, rules.min) < 0 || rules.max && compare(value, rules.max) > 0 || rules.weekdays.includes(date.dayOfWeek))
    && (rules.allowed === null || rules.allowed.some(range => compare(value, range.start) >= 0 && compare(value, range.end) <= 0))
    && !rules.disabled.some(range => compare(value, range.start) >= 0 && compare(value, range.end) <= 0);
}

/** Validate whole intervals without walking years of calendar days. Endpoints must always be available. */
export function isRangeAllowed(range, rules = compileDateRules(), allowUnavailableWithinRange = false) {
  const { start, end } = range;
  if (!start || !end || compare(start, end) > 0 || !isDateAllowed(start, rules) || !isDateAllowed(end, rules)) return false;
  if (allowUnavailableWithinRange) return true;
  if (rules.allowed !== null && !rules.allowed.some(interval => compare(start, interval.start) >= 0 && compare(end, interval.end) <= 0)) return false;
  if (rules.disabled.some(interval => compare(start, interval.end) <= 0 && compare(end, interval.start) >= 0)) return false;
  if (rules.weekdays.length) {
    const first = readValue(start);
    const days = first.until(readValue(end)).days;
    if (days >= 6) return false;
    for (let offset = 1; offset < days; offset++) if (rules.weekdays.includes((first.dayOfWeek - 1 + offset) % 7 + 1)) return false;
  }
  return true;
}

/** A fresh two-click selection uses both dates in chronological order. */
export function rangeFromSelection(first, second) {
  const anchor = canonicalValue(first);
  const value = canonicalValue(second);
  if (!anchor || !value) throw new RangeError("Choose two complete dates.");
  return compare(anchor, value) <= 0 ? { start: anchor, end: value } : { start: value, end: anchor };
}

/** A start edit preserves the chosen end unless it crosses it; never shift to preserve duration. */
export function updateRangeStart(range, value) {
  const start = canonicalValue(value);
  return { start, end: start && range.end && compare(start, range.end) > 0 ? start : range.end };
}

/** An end edit preserves the chosen start unless it crosses it, matching the start-edit rule. */
export function updateRangeEnd(range, value) {
  const end = canonicalValue(value);
  return { start: end && range.start && compare(end, range.start) < 0 ? end : range.start, end };
}

/** Explicit week order wins; locale data supplies the default, with Sunday as the fallback. */
export function calendarWeekStart(locale = "en-US", override) {
  const preference = typeof Intl.Locale === "function" ? new Intl.Locale(locale) : null;
  const first = override ?? (preference?.getWeekInfo?.() ?? preference?.weekInfo)?.firstDay ?? 7;
  if (!Number.isInteger(first) || first < 1 || first > 7) throw new RangeError("Week starts use ISO weekdays 1 (Monday) through 7 (Sunday).");
  return first;
}

/** Six stable calendar rows preserve geometry across months; locale affects labels and default week order. */
export function monthGrid(month, options = {}) {
  const first = Temporal.PlainYearMonth.from(month).toPlainDate({ day: 1 });
  const weekStartsOn = calendarWeekStart(options.locale, options.weekStartsOn);
  const start = first.subtract({ days: (first.dayOfWeek - weekStartsOn + 7) % 7 });
  return Array.from({ length: 6 }, (_, week) => Array.from({ length: 7 }, (_, weekday) => {
    const date = start.add({ days: week * 7 + weekday });
    return { value: date.toString(), day: date.day, outside: date.month !== first.month, label: date.toLocaleString(options.locale, { dateStyle: "full", calendar: "gregory" }) };
  }));
}
