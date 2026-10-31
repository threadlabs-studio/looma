import { preparedModule } from "../shared/prepared-module.js";
import { componentInputs } from "@nextwebwg/html-next/inputs";
import { calendarWeekStart, isValueAllowed } from "../shared/date-time.js";
import { pickerParts, replacePickerParts } from "../shared/date-picker.js";
import { afterFormReset } from "../shared/form-reset.js";
import { externalValueTracker } from "../shared/external-value.js";
import { readOptionalInput } from "../shared/binding-inputs.js";
import { initialFieldValue } from "../shared/initial-field-value.js";

const optionNames = ["type", "valueFormat", "timeZone", "disambiguation", "min", "max", "allowedDates", "allowedRanges", "disabledDates", "disabledRanges", "disabledWeekdays"];

/** Commit calendar and clock choices directly to the typed field and canonical form value. */
function interactions(host) {
  const element = host.element;
  const field = element.querySelector("[data-picker-field]");
  const control = field.querySelector("[data-date-editor]");
  const trigger = element.querySelector("[data-picker-trigger]");
  const popover = element.querySelector("[data-picker-popover]");
  const calendar = element.querySelector("[data-picker-calendar]");
  const time = element.querySelector("[data-picker-time]");
  const clock = time.querySelector("[data-date-editor]");
  let current = host.state.current ?? host.props.value.value ?? "";
  const externalChanged = externalValueTracker(element, { initialValue: host.props.value.value });
  let connected = true;
  let frame;
  const settings = () => Object.fromEntries(optionNames.map(name => [name, host.props[name].value]));
  const initial = initialFieldValue(field, { ...settings(), locale: host.props.locale.value });
  try {
    if (initial !== undefined && initial !== current && (initial || !host.props.required.value) && isValueAllowed(initial, settings())) {
      current = initial; host.state.current = current;
    }
  } catch { /* The field retains an invalid native draft for correction. */ }
  const blocked = () => host.props.disabled.value || host.props.readonly.value || control.matches(":disabled, :read-only");
  const close = restore => {
    host.state.opened = false; host.state.error = "";
    if (restore) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { if (connected) trigger.focus(); });
    }
  };
  const seed = () => {
    const parts = pickerParts(current, settings());
    host.state.draftDate = parts.date;
    host.state.draftTime = parts.time || "00:00";
    host.state.error = "";
  };
  const relay = event => {
    if (!(event instanceof CustomEvent)) return;
    event.stopPropagation();
    if (event.type === "input" || event.type === "change") { current = event.detail.value; host.state.current = current; }
    host.dispatch(event.type, event.detail);
  };
  const overlay = event => {
    if (!(event instanceof CustomEvent) || event.target !== popover) return;
    event.stopPropagation();
    if (event.type === "open") {
      if (blocked()) { close(); return; }
      try { seed(); } catch (error) { host.state.error = error.message; }
      host.state.opened = true;
      queueMicrotask(() => {
        if (connected && host.state.opened && element.ownerDocument.activeElement !== clock) time.dispatchEvent(new CustomEvent("set-value", { cancelable: true, detail: { value: host.state.draftTime } }));
      });
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!connected || !host.state.opened || popover.contains(element.ownerDocument.activeElement)) return;
        const date = host.state.draftDate || host.props.today.value;
        if (date) calendar.dispatchEvent(new CustomEvent("focus-date", { detail: { value: date } }));
        else calendar.querySelector('[data-calendar-day][tabindex="0"], [data-calendar-days][tabindex="0"]')?.focus();
      });
    } else close(event.detail.reason === "escape");
    host.dispatch(event.type, event.detail);
  };
  const select = event => {
    event.stopPropagation();
    if (event instanceof CustomEvent && !blocked()) {
      host.state.draftDate = event.detail.value; host.state.error = "";
      accept(event.detail.trigger, host.props.type.value === "date");
    }
  };
  const draft = event => {
    event.stopPropagation();
    if (event instanceof CustomEvent && time.contains(event.target) && (event.type === "input" || event.type === "change")) {
      host.state.draftTime = event.detail.value;
      if (host.state.draftDate) accept(event.detail.trigger, false);
    }
  };
  const accept = (trigger, dismiss) => {
    if (blocked() || !host.state.opened) return;
    try {
      if (host.props.type.value !== "date") {
        time.dispatchEvent(new Event("validate"));
        if (!clock.checkValidity()) throw new RangeError("Enter a complete, available time.");
      }
      const options = settings();
      const value = replacePickerParts(current, host.state.draftDate, host.state.draftTime, options);
      if (!isValueAllowed(value, options)) throw new RangeError("Choose an available value within the permitted range.");
      if (!field.dispatchEvent(new CustomEvent("set-value", { cancelable: true, detail: { value, trigger } }))) return;
      host.state.error = "";
      if (dismiss) close(true);
    } catch (error) { host.state.error = error.message; }
  };
  const request = event => {
    if (event.target !== element) return;
    if (!field.dispatchEvent(event instanceof CustomEvent ? new CustomEvent(event.type, { cancelable: event.cancelable, detail: event.detail }) : new Event(event.type))) event.preventDefault();
  };
  const mutability = () => { host.state.fieldBlocked = blocked(); if (blocked()) close(); };
  const observer = new MutationObserver(mutability);
  observer.observe(control, { attributes: true, attributeFilter: ["disabled", "readonly"] });
  mutability();
  const fieldEvents = ["input", "change", "query-change", "validation-change"];
  for (const name of fieldEvents) field.addEventListener(name, relay);
  for (const name of ["open", "close"]) popover.addEventListener(name, overlay);
  for (const name of fieldEvents) popover.addEventListener(name, draft);
  calendar.addEventListener("select", select);
  for (const name of ["validate", "set-value"]) element.addEventListener(name, request);
  if (!host.state.anchorId) host.state.anchorId = `ui-date-picker-${Math.random().toString(36).slice(2, 11)}`;
  const stop = host.effect(() => {
    const value = host.props.value.value;
    if (externalChanged(value)) { current = value ?? ""; host.state.current = current; if (host.state.opened) seed(); }
    host.state.enhanced = Boolean(host.props.model.value);
    if (blocked()) close();
  });
  const reset = afterFormReset(control, () => { current = host.props.value.value ?? ""; host.state.current = current; close(); });
  return () => {
    connected = false; cancelAnimationFrame(frame); observer.disconnect(); stop(); reset(); close(); host.state.enhanced = false;
    for (const name of fieldEvents) field.removeEventListener(name, relay);
    for (const name of ["open", "close"]) popover.removeEventListener(name, overlay);
    for (const name of fieldEvents) popover.removeEventListener(name, draft);
    calendar.removeEventListener("select", select);
    for (const name of ["validate", "set-value"]) element.removeEventListener(name, request);
  };
}

/** Prepare civil parts before rendering and retain their producer ownership through hydration. */
export const { connect, prepare, adopt } = preparedModule(host => {
  const inputs = componentInputs(host);
  return {
  props: { model: {
    input: (props, { state }) => ({ value: state.current, type: props.type, valueFormat: props.valueFormat, locale: props.locale, timeZone: props.timeZone, min: props.min, max: props.max,
      ...Object.fromEntries(["weekStartsOn", "allowedDates", "allowedRanges"].map(name => [name, readOptionalInput(inputs, props, name)]).filter(([, value]) => value !== undefined)),
    }),
    load(options) {
      const parts = pickerParts(options.value, options);
      return { ...parts, minDate: pickerParts(options.min, options).date, maxDate: pickerParts(options.max, options).date,
        weekStartsOn: calendarWeekStart(options.locale, options.weekStartsOn),
        allowedDates: options.allowedDates ?? [],
        allowedRanges: options.allowedRanges ?? (options.allowedDates === undefined ? [{ start: "0001-01-01", end: "9999-12-31" }] : []),
      };
    },
  } },
  connect: interactions,
  };
});
