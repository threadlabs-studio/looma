import { page, userEvent } from "@vitest/browser/context";
import { createApp, h, nextTick, reactive, type App } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import { UiDatePicker as DatePicker } from "@threadlabs/looma";
import { componentRegistry } from "@nextwebwg/html-next/runtime";
import "../dist/index.js";
import "../tokens.css";
import "../theme-light.css";
import "../theme-dark.css";

let app: App | undefined;
afterEach(() => { app?.unmount(); app = undefined; document.body.innerHTML = ""; delete document.documentElement.dataset.theme; });

async function mount(adapter: "html" | "vue", initial: Record<string, unknown> = {}) {
  const props = reactive({ value: "2026-10-30", name: "date", label: "Date", locale: "en-GB", ...initial });
  const form = document.createElement("form"); document.body.append(form);
  if (adapter === "vue") { app = createApp({ render: () => h(DatePicker, { ...props }) }); app.mount(form); }
  else {
    const invocation = document.createElement("ui-date-picker");
    for (const [key, value] of Object.entries(props)) invocation.setAttribute(key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`), typeof value === "object" ? JSON.stringify(value) : String(value));
    form.append(invocation);
  }
  await vi.waitFor(() => expect(form.querySelector<HTMLButtonElement>("[data-picker-trigger]")?.hidden).toBe(false));
  const root = form.firstElementChild!;
  const trigger = form.querySelector<HTMLButtonElement>("[data-picker-trigger]")!;
  const editor = form.querySelector<HTMLInputElement>("[data-picker-field] [data-date-editor]")!;
  const clock = form.querySelector<HTMLInputElement>("[data-picker-time] [data-date-editor]")!;
  const popover = form.querySelector<HTMLElement>("[data-picker-popover]")!;
  const events: { type: string; detail: any }[] = [];
  for (const type of ["input", "change", "open", "close"]) form.addEventListener(type, event => { if (event instanceof CustomEvent) events.push({ type, detail: event.detail }); });
  const entries = () => [...new FormData(form)];
  const open = async () => {
    await userEvent.click(trigger);
    await vi.waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("true"));
    await vi.waitFor(() => expect(popover.querySelectorAll("[data-calendar-day]")).toHaveLength(42));
  };
  const action = (name: string) => form.querySelector<HTMLButtonElement>(`[data-picker-${name}]`)!;
  const select = async (value: string) => userEvent.click(popover.querySelector<HTMLButtonElement>(`[data-calendar-day="${value}"]`)!);
  const update = async (values: Record<string, unknown>) => { if (adapter === "vue") Object.assign(props, values); else componentRegistry.update(root, values); await nextTick(); };
  return { form, root, editor, clock, trigger, popover, events, entries, open, action, select, update };
}

for (const adapter of ["html", "vue"] as const) {
  it(`shares progressive time entry and localized clock choices within the calendar in ${adapter}`, async () => {
    const { form, clock, entries, open, trigger } = await mount(adapter, { type: "datetime-local", value: "2026-10-30T14:30", locale: "en-US" });
    await open();
    await userEvent.click(clock);
    await vi.waitFor(() => { expect(document.activeElement).toBe(clock); expect(clock.value.slice(clock.selectionStart!, clock.selectionEnd!)).toBe("2"); });
    await userEvent.keyboard("9:45am{Enter}");
    await vi.waitFor(() => expect(entries()).toEqual([["date", "2026-10-30T09:45"]]));
    const timeTrigger = form.querySelector<HTMLButtonElement>("[data-picker-time] [data-time-trigger]")!;
    await userEvent.click(timeTrigger);
    await vi.waitFor(() => expect(timeTrigger.getAttribute("aria-expanded")).toBe("true"));
    const hours = form.querySelector<HTMLSelectElement>("[data-picker-time] [data-time-hour]")!;
    await userEvent.selectOptions(hours, "15");
    await vi.waitFor(() => expect(entries()).toEqual([["date", "2026-10-30T15:45"]]));
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(timeTrigger.getAttribute("aria-expanded")).toBe("false"));
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("false"));
  });

  it(`retains its accepted date across DOM reconnection in ${adapter}`, async () => {
    const { form, root, editor, entries } = await mount(adapter);
    await userEvent.fill(editor, "2026-11-02"); editor.blur();
    await vi.waitFor(() => expect(entries()).toEqual([["date", "2026-11-02"]]));
    root.remove(); await new Promise(resolve => setTimeout(resolve, 25)); form.append(root);
    await vi.waitFor(() => expect(form.querySelector<HTMLButtonElement>("[data-picker-trigger]")?.hidden).toBe(false));
    await userEvent.click(form.querySelector<HTMLButtonElement>("[data-picker-trigger]")!);
    await userEvent.click(form.querySelector<HTMLButtonElement>('[data-calendar-day="2026-11-02"]')!);
    expect(entries()).toEqual([["date", "2026-11-02"]]);
  });

  it(`exports only dates by default and preserves them across locale and editing-zone changes in ${adapter}`, async () => {
    const { entries, events, open, select, action, update } = await mount(adapter, { timeZone: "Pacific/Kiritimati", displayOptions: { dateStyle: "long" } });
    await open(); await select("2026-10-31");
    await vi.waitFor(() => expect(entries()).toEqual([["date", "2026-10-31"]]));
    const edits = events.filter(event => event.type === "input" || event.type === "change");
    expect(edits.map(event => event.detail.value)).toEqual(["2026-10-31", "2026-10-31"]);
    await update({ timeZone: "America/Adak", locale: "ar-EG" });
    expect(entries()).toEqual([["date", "2026-10-31"]]);
    expect(events.filter(event => event.type === "input" || event.type === "change")).toHaveLength(2);
  });

  it(`commits a calendar date immediately and supports typing, dismissal and reset in ${adapter}`, async () => {
    const { form, editor, trigger, entries, open, select } = await mount(adapter);
    expect(form.querySelector('[data-picker-apply], [data-picker-cancel]')).toBeNull();
    await open(); await select("2026-10-31");
    await vi.waitFor(() => expect(entries()).toEqual([["date", "2026-10-31"]]));
    await vi.waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("false"));
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
    await open(); await userEvent.keyboard("{Escape}");
    expect(entries()).toEqual([["date", "2026-10-31"]]);
    await userEvent.fill(editor, "2026-11-02"); editor.blur();
    await vi.waitFor(() => expect(entries()).toEqual([["date", "2026-11-02"]]));
    form.addEventListener("reset", event => event.preventDefault(), { once: true }); form.reset();
    await new Promise(resolve => setTimeout(resolve, 20)); expect(entries()).toEqual([["date", "2026-11-02"]]);
    form.reset(); await vi.waitFor(() => expect(entries()).toEqual([["date", "2026-10-30"]]));
  });

  it(`preserves local date-time precision, validates time drafts and applies bounds in ${adapter}`, async () => {
    const { clock, entries, open, select, action, popover, trigger } = await mount(adapter, { type: "datetime-local", valueFormat: "space", value: "2026-10-30 14:30:45.123456789", min: "2026-10-30 14:00", max: "2026-11-02 15:00", disabledDates: ["2026-10-31"] });
    await open();
    expect(popover.querySelector<HTMLButtonElement>('[data-calendar-day="2026-10-31"]')!.disabled).toBe(true);
    await select("2026-11-02");
    await vi.waitFor(() => expect(entries()).toEqual([["date", "2026-11-02 14:30:45.123456789"]]));
    await userEvent.fill(clock, "unfinished");
    clock.blur();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(clock.value).toBe("unfinished"); expect(clock.checkValidity()).toBe(false);
    expect(entries()).toEqual([["date", "2026-11-02 14:30:45.123456789"]]);
    await userEvent.fill(clock, "16:00");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    await userEvent.fill(clock, "14:45");
    await vi.waitFor(() => expect(entries()).toEqual([["date", "2026-11-02 14:45"]]));
    await vi.waitFor(() => expect([...popover.querySelectorAll('[role="alert"]')].at(-1)!.textContent?.trim()).toBe(""));
  });

  it(`projects an instant into the editing date and preserves its clock across DST in ${adapter}`, async () => {
    const { clock, entries, open, select, action } = await mount(adapter, { type: "instant", timeZone: "America/New_York", value: "2026-10-31T02:30:45.123456789Z" });
    await open(); expect(clock.value).toBe("22:30:45.123456789");
    await select("2026-11-02");
    await vi.waitFor(() => expect(entries()).toEqual([["date", "2026-11-03T03:30:45.123456789Z"]]));
  });

  it(`uses a zoned value's own region and preserves it through a different editing zone in ${adapter}`, async () => {
    const { clock, entries, open, select, action, update } = await mount(adapter, { type: "zoned", value: "2026-10-30T22:30-04:00[America/New_York]" });
    await open(); expect(clock.value).toBe("22:30");
    await select("2026-11-02");
    await vi.waitFor(() => expect(entries()).toEqual([["date", "2026-11-02T22:30-05:00[America/New_York]"]]));
    await userEvent.keyboard("{Escape}"); await update({ timeZone: "UTC" }); await open(); expect(clock.value).toBe("03:30");
    await select("2026-11-04");
    await vi.waitFor(() => expect(entries()).toEqual([["date", "2026-11-03T22:30-05:00[America/New_York]"]]));
  });

  it(`discards light-dismissed drafts and tracks external readonly/disabled/value changes in ${adapter}`, async () => {
    const { form, editor, trigger, entries, open, select, update } = await mount(adapter);
    await open(); await userEvent.click(form.querySelector<HTMLButtonElement>("[data-calendar-next]")!);
    const outside = document.createElement("button"); outside.type = "button"; outside.textContent = "Outside"; form.append(outside);
    await userEvent.click(outside);
    await vi.waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("false"));
    expect(entries()).toEqual([["date", "2026-10-30"]]);
    await update({ value: "2026-12-15", readonly: true });
    await vi.waitFor(() => expect(entries()).toEqual([["date", "2026-12-15"]]));
    expect(editor.readOnly).toBe(true); expect(trigger.disabled).toBe(true);
    await update({ readonly: false, disabled: true });
    await vi.waitFor(() => expect(entries()).toEqual([])); expect(trigger.disabled).toBe(true);
  });
}

it("keeps the composed picker within a 375px light/dark RTL viewport", async () => {
  await page.viewport(375, 640);
  for (const theme of ["light", "dark"]) {
    document.documentElement.dataset.theme = theme;
    const { form, open, popover } = await mount("vue", { type: "datetime-local", value: "2026-10-30T14:30" });
    form.style.width = "343px"; form.style.fontFamily = "var(--ui-font-family-sans)"; form.dir = theme === "dark" ? "rtl" : "ltr";
    await open(); await vi.waitFor(() => expect(getComputedStyle(popover).opacity).toBe("1"));
    expect(popover.scrollWidth).toBeLessThanOrEqual(popover.clientWidth + 1);
    expect(popover.getBoundingClientRect().right).toBeLessThanOrEqual(375);
    await page.screenshot({ path: `../../../.context/date-picker-${theme}-mobile.png` });
    app?.unmount(); app = undefined; form.remove();
  }
  await page.viewport(1280, 720);
});
