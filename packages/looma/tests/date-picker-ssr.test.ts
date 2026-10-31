import { JSDOM } from "jsdom";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { renderComponents, closeRenderWorkers } from "@nextwebwg/html-next/server";
import { afterAll, expect, it } from "vitest";
import { UiDatePicker as DatePicker } from "@threadlabs/looma";
import { definitions } from "../dist/index.js";

afterAll(() => closeRenderWorkers());

it("keeps the typed field usable before JavaScript and excludes disabled popup drafts from forms", async () => {
  const html = await renderToString(createSSRApp({ render: () => h("form", [h("label", { for: "due-date" }, "Due date"), h(DatePicker, { inputId: "due-date", name: "due", value: "2026-10-30", required: true })]) }));
  const document = new JSDOM(html).window.document;
  const input = document.querySelector<HTMLInputElement>("#due-date")!;
  expect(input.type).toBe("date"); expect(input.value).toBe("2026-10-30"); expect(input.labels?.[0]?.textContent).toBe("Due date");
  expect(document.querySelector<HTMLButtonElement>("[data-picker-trigger]")!.hidden).toBe(true);
  expect(document.querySelectorAll("[data-calendar-day]")).toHaveLength(42);
  expect([...new document.defaultView!.FormData(document.querySelector("form")!)]).toEqual([["due", "2026-10-30"]]);
});

it("prepares the date projection and nested calendar before native SSR in the actual editing zone", async () => {
  const rendered = await renderComponents('<ui-date-picker data-picker-ssr type="instant" time-zone="America/New_York" value="2026-10-31T02:30:45.123456789Z" min="2026-10-30T02:00Z" max="2026-11-04T01:00Z" locale="en-GB"></ui-date-picker>', {
    definitions, prepare: { module: new URL("./fixtures/calendar-prepare.mjs", import.meta.url).href },
  });
  const document = new JSDOM(rendered.html).window.document;
  expect(document.querySelectorAll("[data-calendar-day]")).toHaveLength(42);
  expect(document.querySelector('[role="columnheader"]')!.textContent?.trim()).toBe("M");
  expect(document.querySelector('[data-calendar-day="2026-10-30"]')!.parentElement!.getAttribute("aria-selected")).toBe("true");
  expect(document.querySelector('[data-picker-time] [data-date-fallback]')!.getAttribute("value")).toBe("22:30:45.123456789");
  expect(document.querySelector<HTMLButtonElement>('[data-calendar-day="2026-10-28"]')!.disabled).toBe(true);
  expect(document.querySelector<HTMLButtonElement>('[data-calendar-day="2026-10-29"]')!.disabled).toBe(false);
});

for (const [weekStart, first, last] of [[6, "S", "F"], [1, "M", "Su"]] as const) {
  it(`prepares Date Picker with ${first} first and ${last} last when explicitly configured`, async () => {
    const rendered = await renderComponents(`<ui-date-picker data-picker-ssr week-starts-on="${weekStart}" value="2026-10-30" locale="en-GB"></ui-date-picker>`, {
      definitions, prepare: { module: new URL("./fixtures/calendar-prepare.mjs", import.meta.url).href },
    });
    const document = new JSDOM(rendered.html).window.document;
    const headings = [...document.querySelectorAll('[role="columnheader"]')].map(heading => heading.textContent?.trim());
    expect(headings[0]).toBe(first); expect(headings.at(-1)).toBe(last);
  });
}
