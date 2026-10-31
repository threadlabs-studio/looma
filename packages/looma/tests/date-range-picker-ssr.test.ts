import { JSDOM } from "jsdom";
import { renderComponents, closeRenderWorkers } from "@nextwebwg/html-next/server";
import { afterAll, expect, it } from "vitest";
import { definitions } from "../dist/index.js";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { UiDateRangePicker as DateRangePicker } from "@threadlabs/looma";

afterAll(() => closeRenderWorkers());

it("prepares the composed range and nested calendar automatically in Vue SSR", async () => {
  const html = await renderToString(createSSRApp({ render: () => h("form", [h(DateRangePicker, {
    value: { start: "2026-10-15", end: "2026-10-18" }, disabledDates: ["2026-10-12"], locale: "en-GB",
    startName: "from", endName: "to", startInputId: "start-date", endInputId: "end-date",
  })]) }));
  const document = new JSDOM(html).window.document;
  expect(document.querySelectorAll("[data-calendar-day]")).toHaveLength(42);
  expect(document.querySelector('[data-calendar-day="2026-10-15"]')!.parentElement!.getAttribute("aria-selected")).toBe("true");
  expect([...new document.defaultView!.FormData(document.querySelector("form")!)]).toEqual([["from", "2026-10-15"], ["to", "2026-10-18"]]);
});

it("renders two labelled date-only form fields before JavaScript", async () => {
  const rendered = await renderComponents('<form><ui-date-range-picker value=\'{"start":"2026-10-10","end":"2026-10-15"}\' start-name="from" end-name="to" start-input-id="start-date" end-input-id="end-date" required></ui-date-range-picker></form>', { definitions });
  const document = new JSDOM(rendered.html).window.document;
  const start = document.querySelector<HTMLInputElement>("#start-date");
  const end = document.querySelector<HTMLInputElement>("#end-date");
  expect(start?.type).toBe("date"); expect(end?.type).toBe("date");
  expect(start?.labels?.[0]?.textContent).toBe("Start date");
  expect(end?.labels?.[0]?.textContent).toBe("End date");
  expect(start?.required).toBe(true); expect(end?.required).toBe(true);
  expect([...new document.defaultView!.FormData(document.querySelector("form")!)]).toEqual([["from", "2026-10-10"], ["to", "2026-10-15"]]);
});

it("prepares endpoint rules and range highlights before native SSR", async () => {
  const rendered = await renderComponents('<ui-date-range-picker data-range-ssr value=\'{"start":"2026-10-15","end":"2026-10-18"}\' disabled-dates=\'["2026-10-12"]\' locale="en-GB"></ui-date-range-picker>', {
    definitions, prepare: { module: new URL("./fixtures/calendar-prepare.mjs", import.meta.url).href },
  });
  const document = new JSDOM(rendered.html).window.document;
  expect(document.querySelectorAll("[data-calendar-day]")).toHaveLength(42);
  expect(document.querySelector('[data-calendar-day="2026-10-15"]')!.closest('[role="gridcell"]')!.getAttribute("aria-selected")).toBe("true");
  expect(document.querySelector('[data-calendar-day="2026-10-18"]')!.closest('[role="gridcell"]')!.getAttribute("aria-selected")).toBe("true");
  expect(document.querySelector('[role="columnheader"]')!.textContent?.trim()).toBe("M");
});
