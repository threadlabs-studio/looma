import { JSDOM } from "jsdom";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { expect, it } from "vitest";
import { UiTimePicker as TimePicker } from "@threadlabs/looma";

it("keeps a labelled native time field usable before JavaScript and excludes hidden picker drafts", async () => {
  const html = await renderToString(createSSRApp({ render: () => h("form", [
    h("label", { for: "opening-time" }, "Opening time"),
    h(TimePicker, { inputId: "opening-time", name: "opening", value: "09:30:15.125", required: true }),
  ]) }));
  const { window } = new JSDOM(html);
  const input = window.document.querySelector<HTMLInputElement>("input#opening-time")!;
  expect(input.type).toBe("time"); expect(input.value).toBe("09:30:15.125"); expect(input.required).toBe(true);
  expect(input.labels?.[0]?.textContent).toBe("Opening time");
  expect(window.document.querySelector<HTMLButtonElement>("[data-time-trigger]")!.hidden).toBe(true);
  const drafts = [...window.document.querySelectorAll<HTMLSelectElement>("[data-time-popover] select")];
  expect(drafts).toHaveLength(3); expect(drafts.every(control => control.disabled)).toBe(true);
  input.value = "10:45";
  expect([...new window.FormData(window.document.querySelector("form")!)]).toEqual([["opening", "10:45"]]);
});

it("associates only the canonical time with an external form and omits disabled pickers", async () => {
  const html = await renderToString(createSSRApp({ render: () => h("div", [
    h("form", { id: "outside" }),
    h(TimePicker, { name: "opening", form: "outside", value: "09:30" }),
    h(TimePicker, { name: "disabled", form: "outside", value: "10:30", disabled: true }),
  ]) }));
  const { window } = new JSDOM(html);
  expect([...new window.FormData(window.document.querySelector("form")!)]).toEqual([["opening", "09:30"]]);
});
