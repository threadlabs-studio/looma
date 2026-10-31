import { userEvent } from "@vitest/browser/context";
import { createApp, h, nextTick, type App } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import { UiInput as Input, UiDateField as DateField } from "@threadlabs/looma";
import "../dist/index.js";
import "../tokens.css";
import "../theme-light.css";
import "../theme-dark.css";

let app: App | undefined;
afterEach(() => { app?.unmount(); app = undefined; document.body.innerHTML = ""; delete document.documentElement.dataset.theme; });
const clock = [{ placeholder: "hh", pattern: "[0-9]" }, { literal: ":" }, { placeholder: "mm", pattern: "[0-9]" }];
async function mount(adapter: "html" | "vue", component: "input" | "date-field", props: Record<string, unknown>) {
  const form = document.createElement("form"); document.body.append(form);
  if (adapter === "vue") { app = createApp({ render: () => h(component === "input" ? Input : DateField, props) }); app.mount(form); }
  else {
    const element = document.createElement(`ui-${component}`);
    for (const [key, value] of Object.entries(props)) element.setAttribute(key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`), typeof value === "object" ? JSON.stringify(value) : String(value));
    form.append(element);
  }
  await nextTick();
  await vi.waitFor(() => expect(form.querySelector<HTMLInputElement>(component === "input" ? "input" : "[data-date-editor]:not([hidden])")).not.toBeNull());
  const input = form.querySelector<HTMLInputElement>(component === "input" ? "input" : "[data-date-editor]")!;
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  return { form, input, value: () => new FormData(form).get("entry"), selected: () => input.value.slice(input.selectionStart!, input.selectionEnd!) };
}

for (const adapter of ["html", "vue"] as const) {
  it(`keeps format hints out of native and submitted values in both themes in ${adapter}`, async () => {
    for (const theme of ["light", "dark"]) {
      document.documentElement.dataset.theme = theme;
      const field = await mount(adapter, "date-field", { name: "entry", locale: "en-US" });
      expect(field.input.placeholder.toLowerCase()).toBe("mm/dd/yyyy");
      field.input.focus();
      expect(field.input.value).toBe(""); expect(field.value()).toBe("");
      expect(field.input.matches(":placeholder-shown")).toBe(true);
      expect(getComputedStyle(field.input, "::placeholder").color).not.toBe(getComputedStyle(field.input).color);
      await userEvent.keyboard("11/");
      expect(field.input.value).toBe("11/"); expect(field.value()).toBe("");
      await userEvent.keyboard("05/2027{Enter}");
      expect(field.value()).toBe("2027-11-05");
      field.input.select(); await userEvent.keyboard("{Backspace}{Enter}");
      expect(field.input.value).toBe(""); expect(field.value()).toBe("");
      expect(field.input.matches(":placeholder-shown")).toBe(true);
      app?.unmount(); app = undefined; field.form.remove();
    }
  });

  it(`honors the declared character pattern and supports entry into an empty field in ${adapter}`, async () => {
    const { input, selected } = await mount(adapter, "input", { value: "XY", segments: [{ placeholder: "__", pattern: "[A-Z]" }] });
    input.focus(); await vi.waitFor(() => expect(selected()).toBe("XY"));
    await userEvent.keyboard("{Backspace}aB1C"); expect(input.value).toBe("BC");
  });

  it(`edits blocks progressively, filters characters, and accepts typed separators in ${adapter}`, async () => {
    const { input, selected } = await mount(adapter, "input", { value: "09:30", segments: clock });
    input.focus(); await vi.waitFor(() => expect(selected()).toBe("09"));
    await userEvent.keyboard("1x"); expect(input.value).toBe("1:30");
    await userEvent.keyboard(":"); expect(selected()).toBe("30");
    await userEvent.keyboard("45"); expect(input.value).toBe("1:45");
    await userEvent.keyboard("{ArrowLeft}"); expect(selected()).toBe("1");
    await userEvent.keyboard("08"); expect(input.value).toBe("08:45"); expect(selected()).toBe("45");
    await userEvent.keyboard("{Control>}z{/Control}"); expect(input.value).toBe("0:45");
    await userEvent.keyboard("{Control>}y{/Control}"); expect(input.value).toBe("08:45");
  });

  it(`supports code continuation, backward deletion, full paste and native autofill in ${adapter}`, async () => {
    const { input, value } = await mount(adapter, "input", { name: "entry", autocomplete: "one-time-code", inputmode: "numeric", segments: Array.from({ length: 6 }, () => ({ placeholder: "·", pattern: "[0-9]" })) });
    input.focus();
    await userEvent.keyboard("123"); expect(input.value).toBe("123"); expect(value()).toBe("123");
    await userEvent.keyboard("{Backspace}45"); expect(input.value).toBe("1245");
    const source = document.createElement("textarea"); source.value = "654321"; document.body.append(source);
    source.focus(); source.select(); await userEvent.copy();
    input.focus(); input.select(); await userEvent.paste(); expect(value()).toBe("654321");
    expect(input.autocomplete).toBe("one-time-code");
    input.value = "987654"; input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertReplacementText", data: "987654" }));
    expect(value()).toBe("987654");
  });

  it(`shares block editing with localized date and time fields without changing canonical submission in ${adapter}`, async () => {
    let field = await mount(adapter, "date-field", { name: "entry", value: "2026-10-30", locale: "en-US" });
    field.input.focus(); await vi.waitFor(() => expect(field.selected()).toBe("10"));
    await userEvent.keyboard("11/05/2027{Enter}");
    expect(field.value()).toBe("2027-11-05");
    app?.unmount(); app = undefined; field.form.remove();
    field = await mount(adapter, "date-field", { name: "entry", type: "time", value: "14:30", locale: "en-US" });
    field.input.focus(); await vi.waitFor(() => expect(field.selected()).toBe("2"));
    await userEvent.keyboard("9:45am{Enter}");
    expect(field.value()).toBe("09:45");
  });
}
