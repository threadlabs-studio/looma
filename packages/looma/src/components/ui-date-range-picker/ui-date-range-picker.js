import { preparedModule } from "../shared/prepared-module.js";
import { componentInputs } from "@nextwebwg/html-next/inputs";
import { calendarWeekStart, compileDateRules, isRangeAllowed, rangeFromSelection, updateRangeStart, updateRangeEnd } from "../shared/date-time.js";
import { rangeAvailability } from "../shared/date-range.js";
import { afterFormReset } from "../shared/form-reset.js";
import { externalValueTracker } from "../shared/external-value.js";
import { readOptionalInput } from "../shared/binding-inputs.js";
import { initialFieldValue } from "../shared/initial-field-value.js";

const ruleNames = ["min", "max", "allowedDates", "allowedRanges", "disabledDates", "disabledRanges", "disabledWeekdays"];
const endpoints = ["start", "end"];
const copy = value => ({ start: value?.start ?? "", end: value?.end ?? "" });
const signature = value => JSON.stringify([value.start, value.end]);

/** Coordinate independently typed endpoints and commit completed calendar selections. */
function interactions(host) {
  const element = host.element;
  const fields = Object.fromEntries(endpoints.map(name => [name, element.querySelector(`[data-range-field="${name}"]`)]));
  const controls = Object.fromEntries(endpoints.map(name => [name, fields[name].querySelector("[data-date-editor]")]));
  const values = Object.fromEntries(endpoints.map(name => [name, element.querySelector(`[data-range-value="${name}"]`)]));
  const triggers = Object.fromEntries(endpoints.map(name => [name, element.querySelector(`[data-range-trigger="${name}"]`)]));
  const popover = element.querySelector("[data-range-popover]");
  const calendar = element.querySelector("[data-range-calendar]");
  let current = copy(host.state.current ?? host.props.value.value);
  const externalChanged = externalValueTracker(element, { initialValue: signature(copy(host.props.value.value)) });
  let committed = signature(current);
  let connected = true;
  let setting = false;
  let frame;
  let lastTrigger = "keyboard";
  const settings = () => Object.fromEntries(ruleNames.map(name => [name, host.props[name].value]));
  const allowed = range => isRangeAllowed(range, compileDateRules(settings()), host.props.allowUnavailableWithinRange.value);
  const blocked = () => host.props.disabled.value || host.props.readonly.value || Object.values(controls).some(control => control.matches(":disabled") || control.readOnly);
  const report = (message, endpoint) => {
    host.state.error = message;
    host.dispatch("validation-change", { invalid: Boolean(message), message, ...(endpoint ? { endpoint } : {}) });
  };
  const accept = range => {
    current = copy(range); host.state.current = current; host.state.draft = copy(range);
    // FormData reads made by an input listener see the complete accepted pair.
    for (const name of endpoints) values[name].value = current[name];
  };
  const change = trigger => {
    const next = signature(current);
    if (next === committed) return;
    committed = next; host.dispatch("change", { value: copy(current), trigger });
  };
  const initial = Object.fromEntries(endpoints.map(name => [name, initialFieldValue(fields[name], { locale: host.props.locale.value })]));
  const readable = endpoints.every(name => initial[name] !== undefined);
  const startChanged = initial.start !== undefined && initial.start !== current.start;
  const endChanged = initial.end !== undefined && initial.end !== current.end;
  if (startChanged || endChanged) {
    const range = readable && startChanged && !endChanged ? updateRangeStart(current, initial.start)
      : readable && endChanged && !startChanged ? updateRangeEnd(current, initial.end)
      : { start: initial.start ?? current.start, end: initial.end ?? current.end };
    host.state.draft = copy(range);
    if (readable && (!range.start && !range.end && !host.props.required.value || range.start && range.end && allowed(range))) {
      accept(range); committed = signature(current);
    }
  }
  const close = (restore = false, reason = "programmatic", trigger = "programmatic") => {
    const wasOpen = host.state.opened;
    host.state.opened = false; host.state.anchor = ""; host.state.error = "";
    if (wasOpen) host.dispatch("close", { open: false, reason, trigger });
    if (restore) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { if (connected) element.ownerDocument.getElementById(host.state.activeAnchor)?.focus(); });
    }
  };
  const replaceFields = range => {
    setting = true;
    try {
      for (const name of endpoints) fields[name].dispatchEvent(new CustomEvent("set-value", { cancelable: true, detail: { value: range[name] } }));
    } finally { setting = false; }
  };
  const edit = (name, value, trigger) => {
    const range = (name === "start" ? updateRangeStart : updateRangeEnd)(host.state.draft, value);
    host.state.draft = range;
    const empty = !range.start && !range.end;
    const complete = Boolean(range.start && range.end);
    if (empty && !host.props.required.value || complete && allowed(range)) {
      const changed = signature(range) !== signature(current);
      accept(range); host.state.error = "";
      if (changed) host.dispatch("input", { value: copy(current), trigger });
    } else if (range.start && range.end) {
      const message = "Choose a range with available endpoints and permitted interior dates.";
      controls[name].setCustomValidity(message);
      report(message, name);
    }
  };
  const listeners = [];
  const on = (target, name, run, options) => { target.addEventListener(name, run, options); listeners.push(() => target.removeEventListener(name, run, options)); };
  for (const name of endpoints) {
    on(controls[name], "input", event => { lastTrigger = event.isTrusted ? "keyboard" : "programmatic"; }, true);
    on(controls[name], "focusout", () => change(lastTrigger));
    for (const type of ["input", "change", "query-change", "validation-change"]) on(fields[name], type, event => {
      if (!(event instanceof CustomEvent)) return;
      event.stopPropagation();
      if (setting) return;
      if (type === "query-change") {
        if (!event.detail.query && !blocked()) edit(name, "", lastTrigger);
        host.dispatch(type, { endpoint: name, query: event.detail.query });
      } else if (type === "validation-change") {
        host.dispatch(type, { ...event.detail, endpoint: name });
      } else if (!blocked()) {
        lastTrigger = event.detail.trigger;
        edit(name, event.detail.value, lastTrigger);
        if (type === "change") change(lastTrigger);
      }
    });
    on(triggers[name], "click", event => {
      if (blocked()) return;
      const trigger = event.detail === 0 ? "keyboard" : "pointer";
      const anchorId = triggers[name].id;
      if (host.state.opened && host.state.activeAnchor === anchorId) { close(false, "action", trigger); return; }
      const range = copy(host.state.draft);
      host.state.selection = range; host.state.preview = copy(range);
      host.state.mode = range.start && range.end ? name : "range";
      host.state.anchor = ""; host.state.popupValue = range[name] || range.start || range.end || "";
      host.state.activeAnchor = anchorId; host.state.error = ""; host.state.opened = true;
      host.dispatch("open", { open: true, reason: "action", trigger });
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!connected || !host.state.opened) return;
        const date = host.state.popupValue || host.props.today.value;
        if (date) calendar.dispatchEvent(new CustomEvent("focus-date", { detail: { value: date } }));
        else calendar.querySelector('[data-calendar-day][tabindex="0"], [data-calendar-days][tabindex="0"]')?.focus();
      });
    });
  }
  on(popover, "open", event => { if (event instanceof CustomEvent) event.stopPropagation(); });
  on(popover, "close", event => {
    if (!(event instanceof CustomEvent)) return;
    event.stopPropagation(); close(event.detail.reason === "escape", event.detail.reason, event.detail.trigger);
  });
  // Calendar's scalar edits are local to this composition; range events report both endpoints.
  for (const type of ["input", "change"]) on(calendar, type, event => event.stopPropagation());
  const commitSelection = trigger => {
    const range = copy(host.state.selection);
    if (!allowed(range)) { report("Choose two available dates within the permitted range."); return; }
    const changed = signature(range) !== signature(current);
    accept(range); replaceFields(range);
    if (changed) host.dispatch("input", { value: copy(current), trigger });
    change(trigger); close(true, "action", trigger);
  };
  on(calendar, "select", event => {
    event.stopPropagation();
    if (!(event instanceof CustomEvent) || blocked()) return;
    const value = event.detail.value;
    let range;
    if (host.state.mode === "range") {
      if (!host.state.anchor) {
        host.state.anchor = value; range = { start: value, end: "" };
      } else {
        range = rangeFromSelection(host.state.anchor, value);
        if (!allowed(range)) { report("Choose a range with permitted interior dates."); return; }
        host.state.anchor = "";
      }
    } else range = (host.state.mode === "start" ? updateRangeStart : updateRangeEnd)(host.state.selection, value);
    host.state.selection = range; host.state.preview = copy(range); host.state.popupValue = value; host.state.error = "";
    if (range.start && range.end) commitSelection(event.detail.trigger);
  });
  const preview = event => {
    if (host.state.mode !== "range" || !host.state.anchor || !host.state.opened) return;
    const day = event.target.closest?.("[data-calendar-day]");
    if (!day || day.disabled) return;
    const range = rangeFromSelection(host.state.anchor, day.dataset.calendarDay);
    if (allowed(range) && signature(range) !== signature(host.state.preview)) host.state.preview = range;
  };
  // Pointer movement expresses a new pointer choice. DOM refreshes may fire
  // pointerover under a stationary cursor and must not replace keyboard preview.
  on(calendar, "pointermove", preview); on(calendar, "focusin", preview);
  on(element, "validate", event => {
    if (event.target !== element) return;
    for (const field of Object.values(fields)) field.dispatchEvent(new Event("validate"));
  });
  const mutability = () => { host.state.blocked = Boolean(blocked()); if (blocked()) close(); };
  const observer = new MutationObserver(mutability);
  for (const control of Object.values(controls)) observer.observe(control, { attributes: true, attributeFilter: ["disabled", "readonly"] });
  for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
    if (ancestor.localName === "fieldset") observer.observe(ancestor, { attributes: true, attributeFilter: ["disabled"] });
  }
  if (!host.state.idPrefix) host.state.idPrefix = `ui-date-range-${Math.random().toString(36).slice(2, 11)}`;
  const stop = host.effect(() => {
    const value = copy(host.props.value.value);
    if (externalChanged(signature(value)) && signature(value) !== signature(current)) {
      committed = signature(value); accept(value); close();
    }
    host.state.enhanced = Boolean(host.props.model.value);
    mutability();
  });
  const reset = afterFormReset(controls.start, () => {
    accept(copy(host.props.value.value)); committed = signature(current); close(); replaceFields(current);
  });
  return () => {
    connected = false; cancelAnimationFrame(frame); observer.disconnect(); stop(); reset();
    for (const release of listeners) release();
    host.state.opened = false; host.state.enhanced = false;
  };
}

/** Prepare endpoint rules before rendering and retain their producer ownership through hydration. */
export const { connect, prepare, adopt } = preparedModule(host => {
  const inputs = componentInputs(host);
  return {
    props: { model: {
      input: (props, { state }) => ({
        ...Object.fromEntries(ruleNames.filter(name => !name.startsWith("allowed")).map(name => [name, props[name]])),
        ...Object.fromEntries(["allowedDates", "allowedRanges", "weekStartsOn"].map(name => [name, readOptionalInput(inputs, props, name)]).filter(([, value]) => value !== undefined)),
        locale: props.locale, allowUnavailableWithinRange: props.allowUnavailableWithinRange,
        range: state.draft, selection: state.selection, mode: state.mode, anchor: state.anchor,
      }),
      load(options) {
        const rules = compileDateRules(options);
        const configuration = { rules, allowUnavailableWithinRange: options.allowUnavailableWithinRange };
        const fields = rangeAvailability(options.range, configuration);
        const calendar = rangeAvailability(options.selection, { ...configuration, mode: options.mode, anchor: options.anchor });
        return { ...fields, calendarRanges: calendar.calendarRanges,
          weekStartsOn: calendarWeekStart(options.locale, options.weekStartsOn) };
      },
    } },
    connect: interactions,
  };
});
