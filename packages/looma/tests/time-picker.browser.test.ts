import { page, userEvent } from "@vitest/browser/context";
import { createApp, h, nextTick, reactive, type App } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import { UiTimePicker as TimePicker } from "@threadlabs/looma";
import { UiFormField as FormField } from "@threadlabs/looma";
import { componentRegistry } from "@nextwebwg/html-next/runtime";
import "../dist/index.js";
import "../tokens.css";
import "../theme-light.css";
import "../theme-dark.css";

let app: App | undefined;
afterEach(() => { app?.unmount(); app = undefined; document.body.innerHTML = ""; document.body.removeAttribute("style"); delete document.documentElement.dataset.theme; });
async function mount(adapter: "html" | "vue", initial: Record<string, unknown> = {}, wrap = false) {
  const props = reactive({ name: "time", label: "Time", value: "14:30", locale: "en-GB", ...initial });
  const form = document.createElement("form"); document.body.append(form);
  let submissions = 0;
  form.addEventListener("submit", event => { event.preventDefault(); submissions++; });
  const fieldProps = reactive({ required: true, disabled: false });
  if (adapter === "vue") {
    app = createApp({ render: () => wrap ? h(FormField, { ...fieldProps }, { label: () => h("label", { for: props.inputId }, "Time"), default: () => h(TimePicker, { ...props }) }) : h(TimePicker, { ...props }) }); app.mount(form);
  }
  else {
    const invocation = document.createElement("ui-time-picker");
    for (const [name, value] of Object.entries(props)) invocation.setAttribute(name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`), String(value));
    if (wrap) {
      const wrapper = document.createElement("ui-form-field"); wrapper.setAttribute("required", "true");
      const label = document.createElement("label"); label.slot = "label"; label.htmlFor = String(props.inputId); label.textContent = "Time";
      wrapper.append(label, invocation); form.append(wrapper);
    } else form.append(invocation);
  }
  await nextTick();
  await vi.waitFor(() => expect(form.querySelector("button[data-time-trigger]:not([hidden])")).not.toBeNull());
  const trigger = form.querySelector<HTMLButtonElement>("[data-time-trigger]")!;
  const editor = form.querySelector<HTMLInputElement>("[data-date-editor]")!;
  const popover = form.querySelector<HTMLElement>("[data-time-popover]")!;
  const inputs = ["hour", "minute", "second"].map(part => form.querySelector<HTMLSelectElement>(`[data-time-${part}]`)!);
  await vi.waitFor(() => expect(editor.hidden).toBe(false));
  const events: { type: string; detail: any }[] = [];
  for (const type of ["input", "change", "open", "close"]) form.addEventListener(type, event => { if (event instanceof CustomEvent) events.push({ type, detail: event.detail }); });
  const entries = () => [...new FormData(form)];
  const open = async () => {
    await userEvent.click(trigger);
    await vi.waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("true"));
    await vi.waitFor(() => expect(document.activeElement).toBe(inputs[0]));
  };
  const disableField = (disabled: boolean) => { if (adapter === "vue") fieldProps.disabled = disabled; else componentRegistry.update(form.firstElementChild!, { disabled }); };
  return { props, form, trigger, editor, popover, inputs, events, entries, open, disableField, submissions: () => submissions };
}

for (const adapter of ["html", "vue"] as const) {
  it(`uses localized hour choices and commits immediately without a footer in ${adapter}`, async () => {
    const { open, inputs, entries, form, trigger } = await mount(adapter, { locale: "en-US" });
    await open();
    expect(inputs[0].options[14].textContent?.trim()).toBe("2 PM");
    await userEvent.selectOptions(inputs[0], "15");
    await vi.waitFor(() => expect(entries()).toEqual([["time", "15:30"]]));
    expect(form.querySelector("[data-time-apply], [data-time-cancel]")).toBeNull();
    await userEvent.keyboard("{Escape}");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(entries()).toEqual([["time", "15:30"]]);
  });

  it(`retains its accepted time across DOM reconnection in ${adapter}`, async () => {
    const { form, editor, entries } = await mount(adapter);
    await userEvent.fill(editor, "15:45"); editor.blur();
    await vi.waitFor(() => expect(entries()).toEqual([["time", "15:45"]]));
    const root = form.firstElementChild!;
    root.remove(); await new Promise(resolve => setTimeout(resolve, 25)); form.append(root);
    await vi.waitFor(() => expect(form.querySelector<HTMLButtonElement>("[data-time-trigger]")?.hidden).toBe(false));
    await userEvent.click(form.querySelector<HTMLButtonElement>("[data-time-trigger]")!);
    await vi.waitFor(() => expect(form.querySelector<HTMLSelectElement>("[data-time-hour]")!.value).toBe("15"));
    await userEvent.keyboard("{Escape}");
    expect(entries()).toEqual([["time", "15:45"]]);
  });

  it(`honors required and disabled states owned by a surrounding Form Field in ${adapter}`, async () => {
    const { form, editor, trigger, disableField, entries } = await mount(adapter, { inputId: "required-time" }, true);
    await vi.waitFor(() => expect(editor.required).toBe(true));
    for (let attempt = 0; attempt < 2; attempt++) {
      await userEvent.fill(editor, ""); editor.blur(); expect(form.checkValidity()).toBe(false);
      await userEvent.fill(editor, "09:45"); editor.blur(); await vi.waitFor(() => expect(form.checkValidity()).toBe(true));
    }
    disableField(true); await nextTick();
    await vi.waitFor(() => expect(trigger.disabled).toBe(true)); expect(entries()).toEqual([]);
    disableField(false); await nextTick();
    await vi.waitFor(() => expect(trigger.disabled).toBe(false)); expect(entries()).toEqual([["time", "09:45"]]);
  });
  it(`commits choices once, retains edits on Escape and restores trigger focus in ${adapter}`, async () => {
    const { entries, editor, open, inputs, trigger, events, submissions } = await mount(adapter);
    await open(); expect(inputs[0].value).toBe("14"); expect(inputs[1].value).toBe("30");
    await userEvent.selectOptions(inputs[0], "15");
    await vi.waitFor(() => expect(entries()).toEqual([["time", "15:30"]]));
    await userEvent.tab(); expect(document.activeElement).toBe(inputs[1]);
    expect(submissions()).toBe(0);
    expect(events.filter(event => event.type === "change")).toHaveLength(1);
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(entries()).toEqual([["time", "15:30"]]);
    await userEvent.fill(editor, "unfinished"); editor.blur(); expect(editor.checkValidity()).toBe(false);
    await open(); expect(inputs[0].value).toBe("15");
    await userEvent.selectOptions(inputs[1], "45");
    await vi.waitFor(() => expect(entries()).toEqual([["time", "15:45"]]));
    expect(editor.checkValidity()).toBe(true);
    expect(events.filter(event => event.type === "change")).toHaveLength(2);
  });

  it(`validates overnight bounds, preserves fractions and keeps cancelled resets intact in ${adapter}`, async () => {
    const { form, entries, open, inputs, trigger, popover } = await mount(adapter, { value: "23:15:30.125", min: "21:00", max: "03:00" });
    await open(); expect(inputs[2].disabled).toBe(false);
    expect(inputs[0].options[12].disabled).toBe(true);
    inputs[0].value = "12"; inputs[0].dispatchEvent(new Event("change", { bubbles: true }));
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    await vi.waitFor(() => expect(popover.querySelector('[role="alert"]')?.textContent).toContain("permitted range"));
    expect(entries()).toEqual([["time", "23:15:30.125"]]);
    await userEvent.selectOptions(inputs[0], "1");
    await vi.waitFor(() => expect(entries()).toEqual([["time", "01:15:30.125"]]));
    form.addEventListener("reset", event => event.preventDefault(), { once: true }); form.reset();
    await new Promise(resolve => setTimeout(resolve, 20)); expect(entries()).toEqual([["time", "01:15:30.125"]]);
    form.reset(); await vi.waitFor(() => expect(entries()).toEqual([["time", "23:15:30.125"]]));
    expect(inputs.every(input => input.disabled)).toBe(true);
  });

  it(`keeps direct typing, light dismissal and Input Group's visible focus target in ${adapter}`, async () => {
    const { form, editor, entries, open, inputs, trigger, events } = await mount(adapter);
    const group = editor.closest<HTMLElement>("[data-ui-input-group-state]")!;
    group.dispatchEvent(new MouseEvent("click", { bubbles: true })); expect(document.activeElement).toBe(editor);
    await userEvent.fill(editor, "09:45"); editor.blur();
    await vi.waitFor(() => expect(entries()).toEqual([["time", "09:45"]]));
    expect(events.filter(event => event.type === "change")).toHaveLength(1);
    await open(); expect(inputs[0].value).toBe("9");
    await userEvent.selectOptions(inputs[0], "10");
    const outside = document.createElement("button"); outside.type = "button"; outside.textContent = "Outside"; form.append(outside);
    await userEvent.click(outside);
    await vi.waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("false"));
    expect(entries()).toEqual([["time", "10:45"]]); expect(document.activeElement).toBe(outside);
  });
}

it("tracks external values, bounds, readonly and disabled without silently replacing an invalid value", async () => {
  const { props, editor, trigger, entries, open } = await mount("vue");
  const group = editor.closest<HTMLElement>("[data-ui-input-group-state]")!;
  const enabledSurface = getComputedStyle(group).backgroundColor;
  props.value = "10:15"; await nextTick(); await vi.waitFor(() => expect(entries()).toEqual([["time", "10:15"]]));
  props.min = "11:00"; await nextTick(); await vi.waitFor(() => expect(editor.checkValidity()).toBe(false));
  expect(entries()).toEqual([["time", "10:15"]]);
  props.min = ""; props.readonly = true; await nextTick();
  expect(trigger.disabled).toBe(true); expect(editor.readOnly).toBe(true); expect(entries()).toEqual([["time", "10:15"]]);
  props.readonly = false; await nextTick(); await open();
  props.disabled = true; await nextTick();
  await vi.waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("false"));
  expect(entries()).toEqual([]); expect(getComputedStyle(group).backgroundColor).not.toBe(enabledSurface);
});

it("exposes seconds when bounds require them without rounding the permitted window", async () => {
  const { props, open, inputs, entries, form } = await mount("vue", { value: "09:30", min: "09:30:01", max: "09:30:59" });
  await open(); expect(inputs[2].disabled).toBe(false);
  expect(inputs[2].options[0].disabled).toBe(true); expect(inputs[2].options[1].disabled).toBe(false);
  props.min = "09:30:15"; await nextTick();
  await vi.waitFor(() => expect(inputs[2].options[1].disabled).toBe(true));
  await userEvent.selectOptions(inputs[2], "15");
  await vi.waitFor(() => expect(entries()).toEqual([["time", "09:30:15"]]));
  await vi.waitFor(() => expect(form.checkValidity()).toBe(true));
});

it("uses the shared surfaces in a narrow light/dark RTL layout", async () => {
  await page.viewport(375, 640);
  document.body.style.backgroundColor = "var(--ui-surface)";
  document.body.style.color = "var(--ui-text-primary)";
  for (const theme of ["light", "dark"]) {
    document.documentElement.dataset.theme = theme;
    const { form, open, popover, inputs } = await mount("vue", { value: "23:15:30.125" });
    form.dir = "rtl"; form.style.width = "343px"; form.style.fontFamily = "var(--ui-font-family-sans)";
    await open();
    await vi.waitFor(() => expect(getComputedStyle(popover).opacity).toBe("1"));
    expect(form.scrollWidth).toBeLessThanOrEqual(form.clientWidth + 1);
    expect(popover.scrollWidth).toBeLessThanOrEqual(popover.clientWidth + 1);
    expect(getComputedStyle(inputs[0]).backgroundPositionX.split(",")[0].trim()).toBe("8px");
    await page.screenshot({ path: `../../../.context/time-picker-${theme}-mobile.png` });
    app?.unmount(); app = undefined; form.remove();
  }
  await page.viewport(1280, 720);
});
