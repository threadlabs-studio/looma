import { preparedModule } from "../shared/prepared-module.js";
import { componentInputs } from "@nextwebwg/html-next/inputs";
import { Temporal, asciiDigits, canonicalValue, compileDateRules, isDateAllowed } from "../shared/date-time.js";
import { availableDate } from "../shared/date-navigation.js";
import { createCalendarBindings } from "./calendar-source.js";

const constraintNames = ["min", "max", "allowedDates", "allowedRanges", "disabledDates", "disabledRanges", "disabledWeekdays"];

/** Navigate civil dates independently of typed entry, using the same Temporal availability rules. */
function interactions(host) {
  const element = host.element;
  const inputs = componentInputs(host);
  let frame;
  let connected = true;
  const model = () => host.props.model.value;
  const blocked = () => host.props.disabled.value;
  const settings = () => Object.fromEntries(constraintNames.map(key => [key, host.props[key].value]));
  const focus = selector => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (!connected) return;
      const target = element.querySelector(selector) ?? element.querySelector(host.state.mode === "days" ? '[data-calendar-days][tabindex="0"]' : "[data-calendar-year-toggle]");
      if (target && !target.closest("[hidden]")) target.focus();
    });
  };
  const focusView = () => focus(host.state.mode === "days" ? '[data-calendar-day][tabindex="0"]' : `[data-calendar-${host.state.mode === "months" ? "month" : "year"}][tabindex="0"]`);
  const showMonth = (month, trigger = "programmatic") => {
    const previous = model()?.month;
    host.state.visibleMonth = month;
    if (month !== previous) host.dispatch("month-change", { month, trigger });
  };
  const showMode = mode => {
    if (host.state.mode === "days") {
      // Popup entry transforms affect client rectangles, but not the computed layout height.
      const height = parseFloat(getComputedStyle(element.querySelector("[data-calendar-viewport]")).height);
      if (height > 0) host.state.viewHeight = height;
    }
    host.state.mode = mode;
    host.state.yearError = "";
    if (mode === "years") {
      host.state.yearPageStart = Math.floor((Number(model().month.slice(0, 4)) - 1) / 12) * 12 + 1;
      element.querySelector("[data-calendar-year-input]").value = model().yearLabel;
    }
    focusView();
  };
  const select = (value, trigger) => {
    const status = inputs.status("model");
    const ready = constraintNames.every(name => {
      const input = inputs.status(name);
      return !input.pending && !input.error && !input.stale && (input.ready || !inputs.supplied(name));
    });
    if (blocked() || host.props.readonly.value || !ready || !status.ready || status.stale || !isDateAllowed(value, compileDateRules(settings()))) return;
    const changed = value !== host.state.current;
    host.state.current = value; host.state.focusedDate = value;
    showMonth(value.slice(0, 7), trigger);
    if (changed) {
      host.dispatch("input", { value, trigger });
      host.dispatch("change", { value, trigger });
    }
    host.dispatch("select", { value, trigger });
    focus(`[data-calendar-day="${value}"]`);
  };
  const moveDay = (value, direction) => {
    const date = availableDate(value, direction, compileDateRules(settings()));
    if (!date) return;
    host.state.focusedDate = date;
    showMonth(date.slice(0, 7), "keyboard");
    focus(`[data-calendar-day="${date}"]`);
  };
  const navigate = (direction, trigger) => {
    const current = model(); if (!current) return;
    if (host.state.mode === "years") host.state.yearPageStart = Math.max(1, Math.min(9997, current.yearPageStart + direction * 12));
    else {
      const date = Temporal.PlainYearMonth.from(current.month).add(host.state.mode === "days" ? { months: direction } : { years: direction });
      if (date.year < 1 || date.year > 9999) return;
      showMonth(date.toString(), trigger);
    }
  };
  const chooseYear = (year, trigger) => {
    showMonth(`${String(year).padStart(4, "0")}-${model().month.slice(5)}`, trigger);
    showMode("months");
  };
  const goToYear = trigger => {
    const input = element.querySelector("[data-calendar-year-input]");
    const text = asciiDigits(input.value, host.props.locale.value);
    const year = Number(text);
    if (!/^\d{1,4}$/.test(text) || year < 1 || year > 9999) {
      host.state.yearError = host.props.yearErrorLabel.value; input.focus(); return;
    }
    chooseYear(year, trigger);
  };
  const click = event => {
    const button = event.target.closest?.("button");
    if (blocked() || !button || button.disabled || !element.contains(button)) return;
    const trigger = event.detail === 0 ? "keyboard" : "pointer";
    if (button.hasAttribute("data-calendar-day")) select(button.dataset.calendarDay, trigger);
    else if (button.hasAttribute("data-calendar-month-toggle")) showMode(host.state.mode === "months" ? "days" : "months");
    else if (button.hasAttribute("data-calendar-year-toggle")) showMode(host.state.mode === "years" ? "days" : "years");
    else if (button.hasAttribute("data-calendar-previous")) navigate(-1, trigger);
    else if (button.hasAttribute("data-calendar-next")) navigate(1, trigger);
    else if (button.hasAttribute("data-calendar-month")) { showMonth(button.dataset.calendarMonth, trigger); showMode("days"); }
    else if (button.hasAttribute("data-calendar-year")) chooseYear(Number(button.dataset.calendarYear), trigger);

  };
  const keydown = event => {
    if (blocked() || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "Escape" && host.state.mode !== "days") { event.preventDefault(); event.stopPropagation(); showMode("days"); return; }
    if (event.target.matches("[data-calendar-year-input]")) {
      if (event.key === "Enter") { event.preventDefault(); goToYear("keyboard"); }
      return;
    }
    const button = event.target.closest?.("button"); if (!button) return;
    const horizontal = getComputedStyle(element).direction === "rtl" ? -1 : 1;
    if (button.hasAttribute("data-calendar-day")) {
      const date = Temporal.PlainDate.from(button.dataset.calendarDay);
      let target; let direction;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { direction = (event.key === "ArrowRight" ? 1 : -1) * horizontal; target = date.add({ days: direction }); }
      else if (event.key === "ArrowUp" || event.key === "ArrowDown") { direction = event.key === "ArrowDown" ? 1 : -1; target = date.add({ days: direction * 7 }); }
      else if (event.key === "PageUp" || event.key === "PageDown") { direction = event.key === "PageDown" ? 1 : -1; target = date.add(event.shiftKey ? { years: direction } : { months: direction }); }
      else if (event.key === "Home" || event.key === "End") {
        const offset = (date.dayOfWeek - model().weekStartsOn + 7) % 7;
        direction = event.key === "Home" ? 1 : -1;
        target = date.add({ days: event.key === "Home" ? -offset : 6 - offset });
        const found = availableDate(target.toString(), direction, compileDateRules(settings()));
        if (!found || Math.abs(Temporal.PlainDate.from(found).since(target, { largestUnit: "days" }).days) > 6) { event.preventDefault(); return; }
      } else return;
      event.preventDefault(); moveDay(target.toString(), direction);
    } else if (button.matches("[data-calendar-month], [data-calendar-year]")) {
      const name = host.state.mode === "months" ? "month" : "year";
      const buttons = [...element.querySelectorAll(`[data-calendar-${name}]`)];
      let index = buttons.indexOf(button); let step;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") step = (event.key === "ArrowRight" ? 1 : -1) * horizontal;
      else if (event.key === "ArrowUp" || event.key === "ArrowDown") step = event.key === "ArrowDown" ? 3 : -3;
      else if (event.key === "Home" || event.key === "End") { index = event.key === "Home" ? -1 : buttons.length; step = event.key === "Home" ? 1 : -1; }
      else return;
      event.preventDefault();
      for (index += step; index >= 0 && index < buttons.length; index += step) {
        if (buttons[index].disabled) continue;
        for (const item of buttons) item.tabIndex = -1;
        buttons[index].tabIndex = 0; buttons[index].focus(); break;
      }
    }
  };
  const focusin = event => {
    const button = event.target.closest?.("[data-calendar-day]");
    if (button) for (const day of element.querySelectorAll("[data-calendar-day]")) day.tabIndex = day === button ? 0 : -1;
  };
  const request = event => {
    if (event.target !== element || !(event instanceof CustomEvent)) return;
    if (blocked()) { if (event.cancelable) event.preventDefault(); return; }
    try {
      const value = canonicalValue(event.detail?.value);
      if (!value) throw new RangeError("A focus request requires a complete date.");
      host.state.focusedDate = value; showMonth(value.slice(0, 7)); host.state.mode = "days"; focusView();
    } catch { if (event.cancelable) event.preventDefault(); }
  };
  element.addEventListener("click", click);
  element.addEventListener("keydown", keydown);
  element.addEventListener("focusin", focusin);
  element.addEventListener("focus-date", request);
  let externalValue = host.props.value.value;
  let externalMonth = host.props.month.value;
  const stop = host.effect(() => {
    const value = host.props.value.value;
    const month = host.props.month.value;
    if (value !== externalValue) {
      externalValue = value;
      if (host.state.current !== value) {
        host.state.current = value;
        if (!month && value) host.state.visibleMonth = value.slice(0, 7);
      }
    }
    if (month !== externalMonth) { externalMonth = month; host.state.visibleMonth = month; }
  });
  return () => {
    connected = false; cancelAnimationFrame(frame); stop();
    element.removeEventListener("click", click); element.removeEventListener("keydown", keydown);
    element.removeEventListener("focusin", focusin); element.removeEventListener("focus-date", request);
  };
}

/** Share server preparation, producer adoption and browser behavior through one binding instance. */
export const { connect, prepare, adopt } = preparedModule(host => ({
  props: createCalendarBindings(componentInputs(host)), connect: interactions,
}));
