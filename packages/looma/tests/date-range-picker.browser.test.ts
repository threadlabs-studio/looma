import { page, userEvent } from "@vitest/browser/context";
import { createApp, h, nextTick, reactive, type App } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import { UiDateRangePicker as DateRangePicker } from "@threadlabs/looma";
import { componentRegistry } from "@nextwebwg/html-next/runtime";
import "../dist/index.js";
import "../tokens.css";
import "../theme-light.css";
import "../theme-dark.css";

let app: App | undefined;
afterEach(() => { app?.unmount(); app = undefined; document.body.innerHTML = ""; delete document.documentElement.dataset.theme; });

async function mount(adapter: "html" | "vue", initial: Record<string, unknown> = {}, container?: HTMLElement, model = false) {
  const props = reactive({ value: { start: "2026-10-10", end: "2026-10-15" }, startName: "from", endName: "to", startInputId: "range-start", endInputId: "range-end", locale: "en-GB", today: "2026-10-30", ...initial });
  const form = document.createElement("form"); document.body.append(form);
  const target = container ?? form;
  if (container) form.append(container);
  if (adapter === "vue") { app = createApp({ render: () => h(DateRangePicker, { ...props, ...(model ? { "onUpdate:value": (value: { start: string; end: string }) => { props.value = value; } } : {}) }) }); app.mount(target); }
  else {
    const invocation = document.createElement("ui-date-range-picker");
    for (const [key, value] of Object.entries(props)) invocation.setAttribute(key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`), typeof value === "object" ? JSON.stringify(value) : String(value));
    target.append(invocation);
  }
  await vi.waitFor(() => expect(form.querySelector<HTMLButtonElement>('[data-range-trigger="start"]')?.hidden).toBe(false));
  const root = target.firstElementChild!;
  if (model && adapter === "html") form.addEventListener("input", event => {
    if (event instanceof CustomEvent && event.target === root) componentRegistry.update(root, { value: event.detail.value });
  });
  const editor = (name: string) => form.querySelector<HTMLInputElement>(`[data-range-field="${name}"] [data-date-editor]`)!;
  const trigger = (name: string) => form.querySelector<HTMLButtonElement>(`[data-range-trigger="${name}"]`)!;
  const popover = form.querySelector<HTMLElement>("[data-range-popover]")!;
  const action = (name: string) => form.querySelector<HTMLButtonElement>(`[data-range-${name}]`)!;
  const day = (value: string) => form.querySelector<HTMLButtonElement>(`[data-calendar-day="${value}"]`)!;
  const entries = () => [...new FormData(form)];
  const events: { type: string; detail: any }[] = [];
  for (const type of ["input", "change", "open", "close"]) form.addEventListener(type, event => { if (event instanceof CustomEvent) events.push({ type, detail: event.detail }); });
  const update = async (values: Record<string, unknown>) => { if (adapter === "vue") Object.assign(props, values); else componentRegistry.update(root, values); await nextTick(); };
  const open = async (name = "start") => {
    await userEvent.click(trigger(name));
    await vi.waitFor(() => expect(trigger(name).getAttribute("aria-expanded")).toBe("true"));
    await vi.waitFor(() => expect(popover.querySelectorAll("[data-calendar-day]")).toHaveLength(42));
  };
  const type = async (name: string, value: string) => {
    const input = editor(name);
    if (value) await page.getByRole("textbox", { name: input.getAttribute("aria-label")!, exact: true }).fill(value);
    else { input.focus(); input.select(); await userEvent.keyboard("{Backspace}"); }
    input.blur();
  };
  return { form, root, editor, trigger, popover, action, day, entries, events, update, open, type };
}

for (const adapter of ["html", "vue"] as const) {
  it(`reports a committed range once when a controlled parent echoes live values in ${adapter}`, async () => {
    const { form, entries, events, type } = await mount(adapter, {}, undefined, true);
    await type("start", "2026-10-12");
    await vi.waitFor(() => expect(entries()).toEqual([["from", "2026-10-12"], ["to", "2026-10-15"]]));
    expect(events.filter(event => event.type === "change").map(event => event.detail.value)).toEqual([{ start: "2026-10-12", end: "2026-10-15" }]);
    form.reset();
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(entries()).toEqual([["from", "2026-10-12"], ["to", "2026-10-15"]]);
  });

  it(`retains its accepted pair across DOM reconnection without reporting a new edit in ${adapter}`, async () => {
    const { form, root, trigger, entries, events, open, action, type } = await mount(adapter);
    await type("start", "2026-10-12");
    await vi.waitFor(() => expect(entries()).toEqual([["from", "2026-10-12"], ["to", "2026-10-15"]]));
    const changes = events.filter(event => event.type === "change").length;
    const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      root.remove(); await new Promise(resolve => setTimeout(resolve, 25)); form.append(root);
      await vi.waitFor(() => expect(trigger("end").hidden).toBe(false));
      await open("end"); await userEvent.click(form.querySelector<HTMLButtonElement>('[data-calendar-day="2026-10-15"]')!);
      expect(entries()).toEqual([["from", "2026-10-12"], ["to", "2026-10-15"]]);
      expect(events.filter(event => event.type === "change")).toHaveLength(changes);
      expect(warnings).not.toHaveBeenCalled();
    } finally { warnings.mockRestore(); }
  });

  it(`preserves an existing opposite endpoint and collapses only when crossed in ${adapter}`, async () => {
    const { type, entries, events, editor } = await mount(adapter, { displayOptions: { dateStyle: "long" } });
    await type("start", "2026-10-12");
    await vi.waitFor(() => expect(entries()).toEqual([["from", "2026-10-12"], ["to", "2026-10-15"]]));
    await vi.waitFor(() => expect(editor("start").value).toBe("12 October 2026"));
    await type("start", "2026-10-05"); expect(entries()).toEqual([["from", "2026-10-05"], ["to", "2026-10-15"]]);
    await type("start", "2026-10-20");
    await vi.waitFor(() => expect(entries()).toEqual([["from", "2026-10-20"], ["to", "2026-10-20"]]));
    await type("end", "2026-10-18");
    await vi.waitFor(() => expect(entries()).toEqual([["from", "2026-10-18"], ["to", "2026-10-18"]]));
    await type("end", "2026-10-25"); expect(entries()).toEqual([["from", "2026-10-18"], ["to", "2026-10-25"]]);
    expect(events.filter(event => event.type === "change")).toHaveLength(5);
    expect(events.filter(event => event.type === "input").every(event => typeof event.detail.value.start === "string" && typeof event.detail.value.end === "string")).toBe(true);
  });

  it(`keeps partial and invalid drafts out of accepted form values and respects reset cancellation in ${adapter}`, async () => {
    const { form, editor, entries, type } = await mount(adapter);
    await type("start", "unfinished");
    expect(editor("start").value).toBe("unfinished"); expect(form.checkValidity()).toBe(false);
    expect(entries()).toEqual([["from", "2026-10-10"], ["to", "2026-10-15"]]);
    form.addEventListener("reset", event => event.preventDefault(), { once: true }); form.reset();
    await new Promise(resolve => setTimeout(resolve, 20)); expect(editor("start").value).toBe("unfinished");
    form.reset(); await vi.waitFor(() => expect(editor("start").value).toBe("10/10/2026"));
    await type("start", ""); expect(form.checkValidity()).toBe(false);
    expect(entries()).toEqual([["from", "2026-10-10"], ["to", "2026-10-15"]]);
    await type("end", "");
    await vi.waitFor(() => expect(entries()).toEqual([["from", ""], ["to", ""]]));
    expect(form.checkValidity()).toBe(true);
  });

  it(`commits a backwards two-click range and previews keyboard navigation in ${adapter}`, async () => {
    const { entries, open, day, events, popover, trigger } = await mount(adapter, { value: { start: "", end: "" } });
    expect(popover.querySelector('[data-range-apply], [data-range-cancel]')).toBeNull();
    await open();
    await userEvent.click(day("2026-10-15"));
    expect(entries()).toEqual([["from", ""], ["to", ""]]);
    day("2026-10-15").focus(); await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    await vi.waitFor(() => expect(document.activeElement?.getAttribute("data-calendar-day")).toBe("2026-10-13"));
    await vi.waitFor(() => expect(day("2026-10-14").closest('[role="gridcell"]')!.getAttribute("aria-selected")).toBe("true"));
    expect(popover.querySelectorAll('.selection-band').length).toBeGreaterThan(0);
    await userEvent.keyboard("{Enter}");
    await vi.waitFor(() => expect(entries()).toEqual([["from", "2026-10-13"], ["to", "2026-10-15"]]));
    await vi.waitFor(() => expect(trigger("start").getAttribute("aria-expanded")).toBe("false"));
    expect(events.filter(event => event.type === "change").map(event => event.detail.value)).toEqual([{ start: "2026-10-13", end: "2026-10-15" }]);
  });

  it(`commits either calendar endpoint immediately and collapses crossings in ${adapter}`, async () => {
    const { entries, open, day, trigger } = await mount(adapter);
    await open("start"); await userEvent.click(day("2026-10-12"));
    await vi.waitFor(() => expect(entries()).toEqual([["from", "2026-10-12"], ["to", "2026-10-15"]]));
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger("start")));
    await open("start"); await userEvent.click(day("2026-10-20"));
    await vi.waitFor(() => expect(entries()).toEqual([["from", "2026-10-20"], ["to", "2026-10-20"]]));
    await open("end"); await userEvent.click(day("2026-10-05"));
    await vi.waitFor(() => expect(entries()).toEqual([["from", "2026-10-05"], ["to", "2026-10-05"]]));
    await open("end"); await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger("end")));
  });

  it(`applies interior restrictions equally to typing and selection and permits explicit interior crossings in ${adapter}`, async () => {
    const { editor, entries, type, open, day, update, action } = await mount(adapter, { value: { start: "2026-10-15", end: "2026-10-18" }, disabledDates: ["2026-10-12"] });
    await type("start", "2026-10-10"); expect(editor("start").checkValidity()).toBe(false);
    expect(entries()).toEqual([["from", "2026-10-15"], ["to", "2026-10-18"]]);
    await type("start", "2026-10-20");
    await vi.waitFor(() => expect(entries()).toEqual([["from", "2026-10-20"], ["to", "2026-10-20"]]));
    await update({ value: { start: "", end: "" } }); await open(); await userEvent.click(day("2026-10-15"));
    await vi.waitFor(() => expect(day("2026-10-10").disabled).toBe(true));
    await update({ allowUnavailableWithinRange: true });
    await vi.waitFor(() => expect(day("2026-10-10").disabled).toBe(false));
    expect(day("2026-10-12").disabled).toBe(true);
    await userEvent.click(day("2026-10-10"));
    await vi.waitFor(() => expect(entries()).toEqual([["from", "2026-10-10"], ["to", "2026-10-15"]]));
  });

  it(`follows external values, readonly and disabled without editing on locale changes in ${adapter}`, async () => {
    const { entries, editor, trigger, events, open, update } = await mount(adapter);
    await open(); await update({ readonly: true });
    await vi.waitFor(() => expect(trigger("start").getAttribute("aria-expanded")).toBe("false"));
    expect(editor("start").readOnly).toBe(true); expect(trigger("end").disabled).toBe(true);
    await update({ readonly: false, value: { start: "2026-11-02", end: "2026-11-04" }, locale: "ar-EG" });
    await vi.waitFor(() => expect(entries()).toEqual([["from", "2026-11-02"], ["to", "2026-11-04"]]));
    expect(events.filter(event => event.type === "change")).toHaveLength(0);
    await update({ disabled: true }); await vi.waitFor(() => expect(entries()).toEqual([]));
  });

  it(`discards light-dismissed drafts and repairs an invalid draft with an unchanged calendar value in ${adapter}`, async () => {
    const { form, entries, editor, open, day, action, trigger, events, type } = await mount(adapter);
    await open(); await userEvent.click(form.querySelector<HTMLButtonElement>("[data-calendar-next]")!);
    const outside = document.createElement("button"); outside.type = "button"; outside.textContent = "Outside"; form.append(outside);
    await userEvent.click(outside);
    await vi.waitFor(() => expect(trigger("start").getAttribute("aria-expanded")).toBe("false"));
    expect(entries()).toEqual([["from", "2026-10-10"], ["to", "2026-10-15"]]);
    expect(document.activeElement).toBe(outside);
    await type("start", "unfinished"); await open(); await userEvent.click(day("2026-10-10"));
    await vi.waitFor(() => expect(editor("start").value).toBe("10/10/2026"));
    expect(form.checkValidity()).toBe(true);
    expect(events.filter(event => event.type === "change")).toHaveLength(0);
  });

  it(`submits to an external form and closes when an ancestor fieldset disables the range in ${adapter}`, async () => {
    const externalForm = document.createElement("form"); externalForm.id = "range-form"; document.body.append(externalForm);
    const fieldset = document.createElement("fieldset");
    const { form, open, trigger } = await mount(adapter, { form: "range-form" }, fieldset);
    expect([...new FormData(form)]).toEqual([]);
    expect([...new FormData(externalForm)]).toEqual([["from", "2026-10-10"], ["to", "2026-10-15"]]);
    await open(); fieldset.disabled = true;
    await vi.waitFor(() => expect(trigger("start").getAttribute("aria-expanded")).toBe("false"));
    expect([...new FormData(externalForm)]).toEqual([]);
  });
}

it("keeps range fields and the calendar usable at 375px in light/dark and RTL", async () => {
  await page.viewport(375, 720);
  for (const theme of ["light", "dark"]) {
    document.documentElement.dataset.theme = theme;
    const { form, popover, open, day } = await mount("vue", { value: { start: "", end: "" }, locale: theme === "dark" ? "ar-EG" : "en-GB", ...(theme === "dark" ? {
      startLabel: "تاريخ البدء", endLabel: "تاريخ الانتهاء", pickerLabel: "اختر نطاق التاريخ",
    } : {}) });
    form.style.width = "343px"; form.style.fontFamily = "var(--ui-font-family-sans)"; form.dir = theme === "dark" ? "rtl" : "ltr";
    await open(); await userEvent.click(day("2026-10-20")); await userEvent.hover(day("2026-10-15"));
    await vi.waitFor(() => expect(getComputedStyle(popover).opacity).toBe("1"));
    expect(form.scrollWidth).toBeLessThanOrEqual(form.clientWidth + 1);
    expect(popover.scrollWidth).toBeLessThanOrEqual(popover.clientWidth + 1);
    expect(popover.getBoundingClientRect().right).toBeLessThanOrEqual(375);
    for (const header of popover.querySelectorAll('[role="columnheader"]')) {
      const text = document.createRange(); text.selectNodeContents(header);
      const label = text.getBoundingClientRect(); const cell = header.getBoundingClientRect();
      expect(label.left).toBeGreaterThanOrEqual(cell.left - 1);
      expect(label.right).toBeLessThanOrEqual(cell.right + 1);
    }
    await page.screenshot({ path: `../../../.context/date-range-${theme}-mobile.png` });
    app?.unmount(); app = undefined; form.remove();
  }
  await page.viewport(1280, 720);
});
