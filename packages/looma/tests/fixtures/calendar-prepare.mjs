import { prepare as prepareCalendar } from "../../components/ui-calendar/ui-calendar.js";
import { componentInputs } from "@nextwebwg/html-next/inputs";
import { prepare as preparePicker } from "../../components/ui-date-picker/ui-date-picker.js";
import { prepare as prepareRange } from "../../components/ui-date-range-picker/ui-date-range-picker.js";

/** Exercise the shipped producer through the server's real preparation host. */
export async function prepare({ document, host, signal, flush }) {
  const preparations = [];
  for (const element of document.querySelectorAll("[data-picker-ssr]")) {
    const target = host(element);
    preparations.push(await preparePicker(target, { phase: "request", signal }));
    const error = componentInputs(target).status("model").error;
    if (error) throw new Error(JSON.stringify(error));
  }
  for (const element of document.querySelectorAll("[data-range-ssr]")) {
    const target = host(element);
    preparations.push(await prepareRange(target, { phase: "request", signal }));
    const error = componentInputs(target).status("model").error;
    if (error) throw new Error(JSON.stringify(error));
  }
  await flush();
  for (const element of document.querySelectorAll("[data-calendar-ssr], [data-picker-ssr] [data-picker-calendar], [data-range-ssr] [data-range-calendar]")) {
    const target = host(element);
    const preparation = await prepareCalendar(target, { phase: "request", signal });
    const error = componentInputs(target).status("model").error;
    if (error) throw new Error(JSON.stringify(error));
    preparations.push(preparation);
  }
  return () => { for (const preparation of preparations) preparation.dispose(); };
}
