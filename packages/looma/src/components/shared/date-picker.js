import { Temporal, canonicalValue } from "./date-time.js";

/** Project the editable civil parts without treating a plain date as an instant. */
export function pickerParts(value, options = {}) {
  const type = options.type ?? "date";
  if (!value) return { date: "", time: "" };
  const canonical = canonicalValue(value, options);
  if (type === "date") return { date: canonical, time: "" };
  let local;
  if (type === "datetime-local") local = Temporal.PlainDateTime.from(canonical.replace(" ", "T"));
  else if (type === "instant") {
    if (!options.timeZone) throw new RangeError("An explicit time zone is required to edit an exact time.");
    local = Temporal.Instant.from(canonical).toZonedDateTimeISO(options.timeZone).toPlainDateTime();
  } else if (type === "zoned") {
    const zoned = Temporal.ZonedDateTime.from(canonical);
    local = (options.timeZone ? zoned.withTimeZone(options.timeZone) : zoned).toPlainDateTime();
  } else throw new RangeError("Date Picker requires a date-bearing value.");
  return { date: local.toPlainDate().toString(), time: canonicalValue(local.toPlainTime().toString(), { type: "time" }) };
}

/** Replace civil parts while retaining precision and a bound zone, resolving DST explicitly. */
export function replacePickerParts(value, date, time, options = {}) {
  date = canonicalValue(date);
  if (!date) throw new RangeError("Choose a complete date.");
  const type = options.type ?? "date";
  if (type === "date") return date;
  const previous = pickerParts(value, options);
  const clock = canonicalValue(time ?? (previous.time || "00:00"), { type: "time" });
  if (!clock) throw new RangeError("Enter a complete time.");
  if (value && date === previous.date && clock === previous.time) return canonicalValue(value, options);
  const local = Temporal.PlainDate.from(date).toPlainDateTime(Temporal.PlainTime.from(clock));
  if (type === "datetime-local") return canonicalValue(local.toString(), options);
  const boundZone = type === "zoned" && value ? Temporal.ZonedDateTime.from(value).timeZoneId : options.timeZone;
  const editingZone = options.timeZone || boundZone;
  if (!editingZone) throw new RangeError("An explicit time zone is required to edit an exact time.");
  const zoned = local.toZonedDateTime(editingZone, { disambiguation: options.disambiguation ?? "reject" });
  return canonicalValue(type === "instant" ? zoned.toInstant().toString() : zoned.withTimeZone(boundZone).toString(), options);
}
