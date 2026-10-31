import { calendarModel } from "../shared/calendar-model.js";
import { Temporal } from "../shared/date-time.js";
import { readOptionalInput } from "../shared/binding-inputs.js";

const chunk = values => Array.from({ length: Math.ceil(values.length / 3) }, (_, index) => values.slice(index * 3, index * 3 + 3));

/** Pure selected-input producer, shared by server preparation and browser updates. */
export function createCalendarBindings(inputs) {
  return {
    model: {
      // Retain the rendered date cells while synchronous projections refresh,
      // so range previews do not remove the currently focused keyboard target.
      keepPrevious: true,
      input(props, { state }) {
        return {
          month: state.visibleMonth || state.current.slice(0, 7) || props.today.slice(0, 7),
          value: state.current, focusedDate: state.focusedDate, yearPageStart: state.yearPageStart || undefined,
          locale: props.locale, today: props.today, start: props.start, end: props.end,
          weekStartsOn: readOptionalInput(inputs, props, "weekStartsOn"), min: props.min, max: props.max,
          allowedDates: readOptionalInput(inputs, props, "allowedDates"), allowedRanges: readOptionalInput(inputs, props, "allowedRanges"),
          disabledDates: props.disabledDates, disabledRanges: props.disabledRanges, disabledWeekdays: props.disabledWeekdays,
        };
      },
      load(input) {
        const model = calendarModel({ ...input, month: input.month || Temporal.Now.plainDateISO("UTC").toString().slice(0, 7) });
        for (const choices of [model.months, model.years]) {
          const focus = choices.find(item => item.current && !item.disabled) ?? choices.find(item => !item.disabled);
          for (const item of choices) item.tabIndex = item === focus ? 0 : -1;
        }
        return { ...model, monthRows: chunk(model.months), yearRows: chunk(model.years) };
      },
    },
  };
}
