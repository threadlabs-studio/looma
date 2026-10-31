import { Temporal, canonicalValue, isValueAllowed } from "../shared/date-time.js";
import { afterFormReset } from "../shared/form-reset.js";
import { externalValueTracker } from "../shared/external-value.js";
import { initialFieldValue } from "../shared/initial-field-value.js";
import { timeOptions } from "./time-options.js";

/** Commit typed time and localized picker choices through one canonical field. */
export function connect(host) {
  const element = host.element;
  const field = element.querySelector("[data-time-field]");
  const control = field.querySelector("[data-date-editor]");
  const trigger = element.querySelector("[data-time-trigger]");
  const popover = element.querySelector("[data-time-popover]");
  const editors = ["hour", "minute", "second"].map(part => element.querySelector(`[data-time-${part}]`));
  let current = host.state.current ?? host.props.value.value ?? "";
  const externalChanged = externalValueTracker(element, { initialValue: host.props.value.value });
  let draftBase = Temporal.PlainTime.from("00:00");
  let connected = true;
  let focusFrame;
  const blocked = () => host.props.disabled.value || host.props.readonly.value || control.matches(":disabled, :read-only");
  const settings = () => ({ type: "time", min: host.props.min.value, max: host.props.max.value });
  const initial = initialFieldValue(field, { ...settings(), locale: host.props.locale.value, hourCycle: host.props.hourCycle.value });
  try {
    if (initial !== undefined && initial !== current && (initial || !host.props.required.value) && isValueAllowed(initial, settings())) {
      current = initial; host.state.current = current;
    }
  } catch { /* The field retains an invalid native draft for correction. */ }
  const updatePrecision = () => {
    const precision = time => Boolean(time.second || time.millisecond || time.microsecond || time.nanosecond);
    const bounds = [host.props.min.value, host.props.max.value].filter(Boolean).map(value => {
      try { return Temporal.PlainTime.from(canonicalValue(value, { type: "time" })); } catch { return draftBase; }
    });
    host.state.showSeconds = host.props.granularity.value === "second" || precision(draftBase) || Number(editors[2].value) > 0 || bounds.some(precision);
  };
  const seed = () => {
    try { draftBase = Temporal.PlainTime.from(canonicalValue(current || host.props.min.value || "00:00", { type: "time" })); }
    catch { draftBase = Temporal.PlainTime.from("00:00"); }
    ["hour", "minute", "second"].forEach((part, index) => { editors[index].value = String(draftBase[part]); });
    updatePrecision();
    host.state.error = "";
  };
  const choices = () => {
    try {
      const time = draftBase.with(Object.fromEntries(["hour", "minute", "second"].map((part, index) => [part, Number(editors[index].value)])), { overflow: "reject" });
      const availability = timeOptions(time.toString(), { ...settings(), showSeconds: host.state.showSeconds });
      ["hours", "minutes", "seconds"].forEach((part, index) => {
        for (const choice of availability[part]) editors[index].options[Number(choice.value)].disabled = choice.disabled;
      });
    } catch (error) { host.state.error = error.message; }
  };
  const close = (restoreFocus = false) => {
    host.state.opened = false;
    host.state.error = "";
    if (restoreFocus) queueMicrotask(() => { if (connected) trigger.focus(); });
  };
  const mutability = () => { host.state.fieldBlocked = blocked(); if (blocked()) close(); };
  const observer = new MutationObserver(mutability);
  observer.observe(control, { attributes: true, attributeFilter: ["disabled", "readonly"] });
  mutability();
  const relay = event => {
    if (!(event instanceof CustomEvent)) return;
    event.stopPropagation();
    if (event.type === "input" || event.type === "change") {
      current = event.detail.value;
      host.state.current = current;
    }
    host.dispatch(event.type, event.detail);
  };
  const overlay = event => {
    if (!(event instanceof CustomEvent)) return;
    event.stopPropagation();
    if (event.type === "open") {
      if (blocked()) { close(); return; }
      seed(); host.state.opened = true;
      cancelAnimationFrame(focusFrame);
      focusFrame = requestAnimationFrame(() => { if (connected && host.state.opened) { seed(); choices(); editors[0].focus(); } });
    } else {
      close(event.detail.reason === "escape");
    }
    host.dispatch(event.type, event.detail);
  };
  const swallow = event => {
    event.stopPropagation();
    if (editors.includes(event.target)) {
      host.state.error = ""; choices();
      if (event.type === "change") accept(event);
    }
  };
  const accept = event => {
    if (blocked() || !host.state.opened) return;
    try {
      const values = editors.map(input => Number(input.value));
      if (editors.some((input, index) => !input.checkValidity() || !/^\d+$/.test(input.value) || !Number.isInteger(values[index]))) throw new RangeError("Enter whole hours, minutes and seconds.");
      const value = canonicalValue(draftBase.with({ hour: values[0], minute: values[1], second: values[2] }, { overflow: "reject" }).toString(), { type: "time" });
      if (!isValueAllowed(value, settings())) throw new RangeError("Choose a time within the permitted range.");
      const accepted = field.dispatchEvent(new CustomEvent("set-value", { cancelable: true, detail: { value, trigger: event.isTrusted ? "keyboard" : "programmatic" } }));
      if (!accepted) return;
    } catch (error) { host.state.error = error.message; }
  };
  const request = event => {
    if (event.target !== element) return;
    const accepted = field.dispatchEvent(event instanceof CustomEvent ? new CustomEvent(event.type, { detail: event.detail, cancelable: event.cancelable }) : new Event(event.type));
    if (!accepted) event.preventDefault();
  };
  const events = ["input", "change", "query-change", "validation-change"];
  for (const name of events) field.addEventListener(name, relay);
  for (const name of ["open", "close"]) popover.addEventListener(name, overlay);
  for (const name of ["input", "change"]) popover.addEventListener(name, swallow);
  for (const name of ["validate", "set-value"]) element.addEventListener(name, request);
  if (!host.state.anchorId) host.state.anchorId = `ui-time-picker-${Math.random().toString(36).slice(2, 11)}`;
  const stop = host.effect(() => {
    const value = host.props.value.value;
    host.state.hourFormat = { hour: "numeric", timeZone: "UTC", ...(host.props.hourCycle.value ? { hourCycle: host.props.hourCycle.value } : {}) };
    if (externalChanged(value)) {
      current = value ?? ""; host.state.current = current;
      if (host.state.opened) seed();
    }
    if (blocked()) close();
    if (host.state.opened) { updatePrecision(); choices(); }
  });
  host.state.enhanced = true;
  const reset = afterFormReset(control, () => {
    current = host.props.value.value ?? ""; host.state.current = current; close();
  });
  return () => {
    connected = false; cancelAnimationFrame(focusFrame); observer.disconnect(); stop(); reset(); host.state.enhanced = false; close();
    for (const name of events) field.removeEventListener(name, relay);
    for (const name of ["open", "close"]) popover.removeEventListener(name, overlay);
    for (const name of ["input", "change"]) popover.removeEventListener(name, swallow);
    for (const name of ["validate", "set-value"]) element.removeEventListener(name, request);
  };
}
