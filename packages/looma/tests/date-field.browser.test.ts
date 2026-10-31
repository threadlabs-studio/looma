import { page, userEvent } from "@vitest/browser/context";
import { createApp, h, nextTick, reactive, type App } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import { UiDateField as DateField } from "@threadlabs/looma";
import { UiFormField as FormField } from "@threadlabs/looma";
import { UiTimeField as TimeField } from "@threadlabs/looma";
import { parseInput } from "../src/components/shared/date-time.js";
import "../tokens.css";
import "../theme-light.css";
import "../theme-dark.css";

let app: App;
afterEach(() => { app?.unmount(); document.body.innerHTML = ""; delete document.documentElement.dataset.theme; });
const entries = () => [...new FormData(document.querySelector("form")!)];
async function mount(initial: Record<string, unknown> = {}) {
  const props = reactive({ name: "date", label: "Due date", locale: "en-GB", ...initial });
  const events: { type: string; detail: any }[] = [];
  const host = document.createElement("div"); document.body.append(host);
  app = createApp({ render: () => h("form", [h(DateField, { ...props, onInput: (event: CustomEvent) => events.push({ type: "input", detail: event.detail }), onChange: (event: CustomEvent) => events.push({ type: "change", detail: event.detail }) }), h("button", { type: "reset" }, "Reset")]) });
  app.mount(host); await nextTick();
  const editor = host.querySelector<HTMLInputElement>("[data-date-editor]")!;
  await vi.waitFor(() => expect(editor.hidden).toBe(false));
  return { props, host, editor, events };
}

it("preserves invalid drafts across blur and refocus, validates all entry paths, and resets canonical submission", async () => {
  const { editor, events } = await mount({ value: "2026-10-30", min: "2026-10-01", disabledDates: ["2026-11-11"] });
  expect(entries()).toEqual([["date", "2026-10-30"]]);
  await userEvent.fill(editor, "31/10/2026"); editor.blur();
  await vi.waitFor(() => expect(entries()).toEqual([["date", "2026-10-31"]]));
  expect(events.filter(event => event.type === "change").at(-1)!.detail.value).toBe("2026-10-31");
  await userEvent.fill(editor, "2026-11-"); editor.blur(); await nextTick();
  expect(editor.value).toBe("2026-11-"); expect(editor.checkValidity()).toBe(false);
  editor.focus(); expect(editor.value).toBe("2026-11-");
  await userEvent.fill(editor, "11/11/2026"); editor.blur(); expect(editor.checkValidity()).toBe(false);
  await userEvent.click(document.querySelector<HTMLButtonElement>("button")!);
  await vi.waitFor(() => expect(entries()).toEqual([["date", "2026-10-30"]]));
  expect(editor.checkValidity()).toBe(true); expect(editor.value).toBe("30/10/2026");
});

it("reports live edits and follows external value updates without duplicate events", async () => {
  const { props, editor, events } = await mount({ value: "2026-10-30" });
  await userEvent.fill(editor, "31/10/2026"); editor.blur();
  await vi.waitFor(() => expect(editor.value).toBe("31/10/2026"));
  expect(entries()).toEqual([["date", "2026-10-31"]]);
  expect(events.at(-1)!.detail.value).toBe("2026-10-31");
  props.value = "2026-11-02"; await nextTick();
  await vi.waitFor(() => expect(editor.value).toBe("02/11/2026"));
  expect(entries()).toEqual([["date", "2026-11-02"]]);
  editor.focus();
  const count = events.filter(event => event.type === "change").length;
  props.value = "2026-11-03"; await nextTick(); editor.blur();
  expect(events.filter(event => event.type === "change")).toHaveLength(count);
});

it("retains its accepted value across DOM reconnection and accepts external replacements while disconnected", async () => {
  const { props, host, editor } = await mount({ value: "2026-10-30" });
  await userEvent.fill(editor, "2026-11-02"); editor.blur();
  await vi.waitFor(() => expect(entries()).toEqual([["date", "2026-11-02"]]));
  const parent = host.parentElement!;
  host.remove(); await new Promise(resolve => setTimeout(resolve, 25)); parent.append(host);
  await vi.waitFor(() => expect(editor.hidden).toBe(false));
  expect(entries()).toEqual([["date", "2026-11-02"]]);
  host.remove(); await new Promise(resolve => setTimeout(resolve, 25)); props.value = "2026-11-05";
  await nextTick(); parent.append(host);
  await vi.waitFor(() => expect(entries()).toEqual([["date", "2026-11-05"]]));
});

it("changes time fallback precision during external replacement without a computed cycle", async () => {
  const { props, host, editor } = await mount({ type: "time", value: "14:30:45.123456789" });
  expect(host.querySelector<HTMLInputElement>("[data-date-fallback]")!.type).toBe("text");
  props.value = "14:45"; await nextTick();
  await vi.waitFor(() => expect(editor.value).toBe("14:45"));
  expect(host.querySelector<HTMLInputElement>("[data-date-fallback]")!.type).toBe("time");
  props.value = "14:30:45.123456789"; await nextTick();
  await vi.waitFor(() => expect(editor.value).toBe("14:30:45.123456789"));
  expect(host.querySelector<HTMLInputElement>("[data-date-fallback]")!.type).toBe("text");
});

it("validates explicit choices and replaces an invalid draft even when its accepted value is unchanged", async () => {
  const { host, editor, events, props } = await mount({ value: "2026-10-30", min: "2026-10-01" });
  const field = editor.closest<HTMLElement>("[data-ui-date-field-state]")!;
  const choose = (value: string) => field.dispatchEvent(new CustomEvent("set-value", { cancelable: true, detail: { value, trigger: "pointer" } }));
  await userEvent.fill(editor, "unfinished"); editor.blur(); expect(editor.checkValidity()).toBe(false);
  choose("2026-10-30");
  await vi.waitFor(() => expect(editor.value).toBe("30/10/2026")); expect(editor.checkValidity()).toBe(true);
  expect(events.filter(event => event.type === "change")).toHaveLength(0);
  choose("2026-11-01"); await nextTick(); expect(entries()).toEqual([["date", "2026-11-01"]]);
  expect(events.filter(event => event.type === "change")).toHaveLength(1);
  expect(choose("2026-09-30")).toBe(false); expect(entries()).toEqual([["date", "2026-11-01"]]);
  expect(editor.checkValidity()).toBe(true);
  props.disabled = true; await nextTick(); expect(choose("2026-11-02")).toBe(false);
  props.disabled = false; await nextTick(); expect(entries()).toEqual([["date", "2026-11-01"]]);
  host.querySelector("form")!.reset(); await vi.waitFor(() => expect(entries()).toEqual([["date", "2026-10-30"]]));
});

it("keeps the typed representation and caret when a consumer reflects input back into value", async () => {
  const { props, host, editor } = await mount({ value: "2026-10-30" });
  host.addEventListener("input", event => { if (event instanceof CustomEvent) props.value = event.detail.value; });
  await userEvent.fill(editor, "2026-11-01"); await nextTick();
  expect(editor.value).toBe("2026-11-01");
  expect(editor.selectionStart).toBe(editor.value.length);
  editor.blur(); await nextTick();
  await vi.waitFor(() => expect(editor.value).toBe("01/11/2026"));
});

it("keeps Intl display separate from typing, handles localized digits, and revalidates changed availability", async () => {
  const { props, editor } = await mount({ value: "2026-10-30", locale: "en-US", displayOptions: { dateStyle: "long" } });
  expect(editor.value).toBe("October 30, 2026");
  await userEvent.fill(editor, "2026-10-31"); editor.blur();
  await vi.waitFor(() => expect(entries()).toEqual([["date", "2026-10-31"]]));
  editor.focus(); expect(editor.value).toBe("10/31/2026");
  await userEvent.fill(editor, "2026-11-01"); editor.blur();
  await vi.waitFor(() => expect(editor.value).toBe("November 1, 2026"));
  props.disabledDates = ["2026-11-01"]; await nextTick();
  expect(editor.checkValidity()).toBe(false); expect(entries()).toEqual([["date", "2026-11-01"]]);
  props.disabledDates = []; props.displayOptions = {}; props.locale = "ar-EG"; await nextTick();
  expect(parseInput("٣٠/١١/٢٠٢٦", { locale: "ar-EG" })).toBe("2026-11-30");
  await userEvent.fill(editor, "٣٠/١١/٢٠٢٦"); editor.blur();
  expect(editor.validationMessage).toBe("");
  await vi.waitFor(() => expect(entries()).toEqual([["date", "2026-11-30"]]));
});

it("rejects daylight-saving gaps and repeated times and preserves the chosen explicit resolution", async () => {
  const { props, editor } = await mount({ type: "instant", timeZone: "America/New_York", value: "2026-10-30T18:30:00Z" });
  await userEvent.fill(editor, "2026-03-08T02:30"); editor.blur(); expect(editor.checkValidity()).toBe(false);
  await userEvent.fill(editor, "2026-11-01T01:30"); editor.blur(); expect(editor.checkValidity()).toBe(false);
  props.disambiguation = "later"; await nextTick();
  editor.focus(); editor.blur();
  await vi.waitFor(() => expect(entries()).toEqual([["date", "2026-11-01T06:30:00Z"]]));
});

it("preserves a saved zone through localized typing in another editing zone and accepts an explicit zone replacement", async () => {
  const { props, editor, events } = await mount({ type: "zoned", timeZone: "UTC", value: "2026-10-30T22:30-04:00[America/New_York]" });
  await userEvent.fill(editor, "2026-11-03T02:30"); editor.blur();
  const value = "2026-11-02T21:30-05:00[America/New_York]";
  await vi.waitFor(() => expect(entries()).toEqual([["date", value]]));
  expect(events.at(-1)!.detail.value).toBe(value);
  const count = events.length;
  props.timeZone = "America/Los_Angeles"; await nextTick();
  expect(entries()).toEqual([["date", value]]); expect(events).toHaveLength(count);
  await userEvent.fill(editor, "2026-11-03T09:00-08:00[America/Los_Angeles]"); editor.blur();
  await vi.waitFor(() => expect(entries()).toEqual([["date", "2026-11-03T09:00-08:00[America/Los_Angeles]"]]));
});

it("honors readonly, disabled, required, and cancelled form resets", async () => {
  const { props, editor } = await mount({ value: "2026-10-30", readonly: true });
  expect(editor.readOnly).toBe(true); expect(entries()).toEqual([["date", "2026-10-30"]]);
  props.readonly = false; props.required = true; await nextTick();
  editor.focus(); editor.select(); await userEvent.keyboard("{Backspace}"); editor.blur(); expect(editor.checkValidity()).toBe(false);
  props.required = false; await nextTick();
  await vi.waitFor(() => expect(editor.checkValidity()).toBe(true));
  await userEvent.fill(editor, "2026-11-01"); editor.blur();
  const form = document.querySelector("form")!;
  form.addEventListener("reset", event => event.preventDefault(), { once: true }); form.reset();
  await new Promise(resolve => setTimeout(resolve, 20));
  expect(entries()).toEqual([["date", "2026-11-01"]]);
  props.disabled = true; await nextTick(); expect(editor.disabled).toBe(true); expect(entries()).toEqual([]);
});

it("composes Time Field with the same canonical submission, midnight grammar and change events", async () => {
  const events: CustomEvent[] = [];
  const host = document.createElement("div"); document.body.append(host);
  app = createApp({ render: () => h("form", [h(TimeField, { name: "opening", label: "Opening time", value: "09:30", hourCycle: "h24", onChange: (event: CustomEvent) => events.push(event) })]) });
  app.mount(host); await nextTick();
  const editor = host.querySelector<HTMLInputElement>("[data-date-editor]")!;
  await vi.waitFor(() => expect(editor.hidden).toBe(false));
  await userEvent.fill(editor, "24:30"); editor.blur();
  await vi.waitFor(() => expect(entries()).toEqual([["opening", "00:30"]]));
  expect(events.at(-1)?.detail.value).toBe("00:30");
});

it("submits and resets through an explicitly associated external form", async () => {
  const host = document.createElement("div"); document.body.append(host);
  app = createApp({ render: () => h("div", [h("form", { id: "external" }), h(DateField, { form: "external", name: "date", label: "Due date", value: "2026-10-30", locale: "en-GB" })]) });
  app.mount(host); await nextTick();
  const editor = host.querySelector<HTMLInputElement>("[data-date-editor]")!;
  await vi.waitFor(() => expect(editor.hidden).toBe(false));
  expect(editor.form?.id).toBe("external");
  await userEvent.fill(editor, "2026-11-01"); editor.blur();
  expect(entries()).toEqual([["date", "2026-11-01"]]);
  document.querySelector("form")!.reset();
  await vi.waitFor(() => expect(entries()).toEqual([["date", "2026-10-30"]]));
});

it("keeps the visible date editor labelled and matches Input styling at 375px in both themes", async () => {
  for (const theme of ["light", "dark"]) {
    document.documentElement.dataset.theme = theme;
    const host = document.createElement("div"); host.style.width = "343px"; host.style.fontFamily = "var(--ui-font-family-sans)"; document.body.append(host);
    app = createApp({ render: () => h(FormField, {}, { label: () => h("label", { for: "due-date" }, "Due date"), default: () => h(DateField, { inputId: "due-date", value: "2026-10-30", locale: "en-GB" }), help: () => h("span", "Day, month, four-digit year") }) });
    app.mount(host); await nextTick();
    const editor = host.querySelector<HTMLInputElement>("[data-date-editor]")!;
    await vi.waitFor(() => expect(editor.hidden).toBe(false));
    await vi.waitFor(() => expect(host.querySelector("label")!.htmlFor).toBe(editor.id));
    expect(editor.getAttribute("aria-describedby")).toBeTruthy();
    const edge = host.getBoundingClientRect(), box = editor.getBoundingClientRect();
    expect(box.width).toBeGreaterThan(200); expect(box.right).toBeLessThanOrEqual(edge.right + 1);
    expect(getComputedStyle(editor).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    await page.screenshot({ element: host, path: `../../../.context/date-field-${theme}-mobile.png` });
    app.unmount(); host.remove();
  }
});
