import { formatInput } from "./date-time.js";

const digit = "[0-9\\p{Decimal_Number}]";
const escapedClass = text => text.replace(/[\\\]\[\-^]/g, "\\$&");

/** Describe the numeric editing representation using the same Intl locale and precision as the field. */
export function dateInputSegments(value, options = {}) {
  const type = options.type ?? "date";
  const date = type !== "time";
  const order = date ? new Intl.DateTimeFormat(options.locale, { year: "numeric", month: "2-digit", day: "2-digit", calendar: "gregory", timeZone: "UTC" })
    .formatToParts(new Date("2006-11-22T12:00Z")).filter(part => ["year", "month", "day"].includes(part.type)).map(part => ({ year: "yyyy", month: "mm", day: "dd" })[part.type]) : [];
  const seed = type === "date" ? "2006-11-22" : type === "time" ? "13:45" : "2006-11-22T13:45";
  let text;
  try { text = formatInput(value || seed, value ? options : { ...options, type: date && type !== "date" ? "datetime-local" : type }); }
  catch { return []; }
  const labels = [...order, "hh", "mm", "ss"];
  let index = 0;
  const periods = [1, 13].map(hour => new Intl.DateTimeFormat(options.locale, { hour: "numeric", hour12: true, timeZone: "UTC" })
    .formatToParts(new Date(`2000-01-01T${String(hour).padStart(2, "0")}:00Z`)).find(part => part.type === "dayPeriod")?.value ?? "");
  return [...text.matchAll(/[\p{Decimal_Number}]+|[\p{Letter}]+|[^\p{Decimal_Number}\p{Letter}]+/gu)].map(([part]) => {
    if (/\p{Decimal_Number}/u.test(part)) return { placeholder: labels[index++] ?? "s".repeat([...part].length), pattern: digit };
    if (/\p{Letter}/u.test(part)) return { placeholder: "a".repeat(Math.max(...periods.map(period => [...period].length), [...part].length)), pattern: `[${escapedClass(periods.join("") + periods.join("").toLocaleLowerCase(options.locale))}]` };
    return { literal: part };
  });
}
