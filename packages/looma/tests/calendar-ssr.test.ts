import { JSDOM } from "jsdom";
import { renderComponents, closeRenderWorkers } from "@nextwebwg/html-next/server";
import { afterAll, expect, it } from "vitest";
import { definitions } from "../dist/index.js";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { UiCalendar as Calendar } from "@threadlabs/looma";

afterAll(() => closeRenderWorkers());

it("prepares the actual Calendar automatically in ordinary Vue SSR with producer transfer records", async () => {
  const html = await renderToString(createSSRApp({ render: () => h(Calendar, { value: "2024-02-29", today: "2024-02-12", locale: "en-GB" }) }));
  const document = new JSDOM(html).window.document;
  expect(document.querySelectorAll("[data-calendar-day]")).toHaveLength(42);
  expect(document.querySelector('[data-calendar-day="2024-02-29"]')!.parentElement!.getAttribute("aria-selected")).toBe("true");
  expect(document.querySelector('[data-calendar-month-toggle]')!.textContent).toContain("February");
  const records = JSON.parse(document.querySelector("[data-html-next-bindings]")!.getAttribute("data-html-next-bindings")!);
  expect(records["ui-calendar"][0]).toBe(1);
  expect(records["ui-calendar"][1]).toMatch(/^[a-f\d]{64}$/);
});

it("prepares the shipped Calendar module before native SSR without invoking browser interactions", async () => {
  const rendered = await renderComponents('<ui-calendar data-calendar-ssr value="2024-02-29" today="2024-02-12" locale="en-GB" min="2024-02-05" disabled-dates=\'["2024-02-13"]\'></ui-calendar>', {
    definitions,
    prepare: { module: new URL("./fixtures/calendar-prepare.mjs", import.meta.url).href },
  });
  const document = new JSDOM(rendered.html).window.document;
  expect(document.querySelectorAll("[data-calendar-day]")).toHaveLength(42);
  expect(document.querySelector('[data-calendar-month-toggle]')!.textContent).toContain("February");
  expect(document.querySelector('[data-calendar-year-toggle]')!.textContent).toContain("2024");
  expect(document.querySelector<HTMLElement>('[data-calendar-years]')!.hidden).toBe(true);
  expect(document.querySelector('[data-calendar-day="2024-02-29"]')!.getAttribute("tabindex")).toBe("0");
  expect(document.querySelector('[data-calendar-day="2024-02-12"]')!.getAttribute("aria-current")).toBe("date");
  expect((document.querySelector('[data-calendar-day="2024-02-13"]') as HTMLButtonElement).disabled).toBe(true);
  expect(document.querySelectorAll('[data-calendar-days] [role="columnheader"]')).toHaveLength(7);
  expect(document.querySelectorAll("[data-calendar-month]")).toHaveLength(12);
  expect(document.querySelectorAll("[data-calendar-year]")).toHaveLength(12);
});

it("renders unavailable values and domain boundaries truthfully without erasing selected identity", async () => {
  const rendered = await renderComponents('<ui-calendar data-calendar-ssr value="0001-01-01" month="0001-01" allowed-dates="[]"></ui-calendar>', {
    definitions,
    prepare: { module: new URL("./fixtures/calendar-prepare.mjs", import.meta.url).href },
  });
  const document = new JSDOM(rendered.html).window.document;
  expect([...document.querySelectorAll<HTMLButtonElement>("[data-calendar-day]")].every(button => button.disabled)).toBe(true);
  expect(document.querySelectorAll('[data-calendar-day][tabindex="0"]')).toHaveLength(0);
  expect(document.querySelector('[data-calendar-day="0001-01-01"]')!.parentElement!.getAttribute("aria-selected")).toBe("true");
  expect((document.querySelector("[data-calendar-previous]") as HTMLButtonElement).disabled).toBe(true);
});
