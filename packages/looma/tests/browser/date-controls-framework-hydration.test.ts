import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { afterAll, describe, it } from "vitest";
import { closeRenderWorkers } from "@nextwebwg/html-next/server";

import { root, bundle, open } from "../renderers/browser-driver";

afterAll(() => closeRenderWorkers());

describe("Date controls framework hydration", () => {
  it("keeps a newer external value ahead of a pending native-field handoff", async () => {
    const { createHydratedScene, sceneNode } = await import("@looma-test/scene");
    const { renderSceneToString } = await import("@looma-test/scene");
    const { UiDateField: DateField } = await import("@looma-test/components");
    const props = { name: "due", inputId: "replacement-date", value: "2026-10-30", locale: "en-GB" };
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode("form", [sceneNode(DateField, props)]) }));
    const path = await bundle("native-handoff-replacement", `
      import { createHydratedScene, sceneNode, stateObject } from "@looma-test/scene";
      import { UiDateField as DateField } from '@looma-test/components';
      const props = stateObject(${JSON.stringify(props)});
      window.nativeReplacementProps = props;
      window.nativeReplacementInputs = [];
      createHydratedScene({ render: () => sceneNode('form', [sceneNode(DateField, { ...props,
        'bind:value': value => props.value = value,
        onInput: event => window.nativeReplacementInputs.push(event.detail.value),
      })]) }).mount('#app');
    `);
    const page = await open(path, `<div id="app">${html}</div>`, [join(root, "tokens.css")], {}, undefined, async page => {
      await page.locator('#replacement-date').fill("");
      await page.locator('#replacement-date').press("1");
      assert.equal(await page.locator('#replacement-date').evaluate(input => (input as HTMLInputElement).validity.badInput), true);
      await page.locator('#replacement-date').evaluate(input => input.addEventListener('input', () => {
        queueMicrotask(() => { (window as any).nativeReplacementProps.value = "2026-12-03"; });
      }, { once: true }));
    });
    try {
      await page.locator('#replacement-date').fill("2026-11-02");
      await page.waitForTimeout(50);
      assert.deepEqual(await page.locator("form").evaluate(form => [...new FormData(form as HTMLFormElement)]), [["due", "2026-12-03"]]);
      assert.deepEqual(await page.evaluate(() => (window as any).nativeReplacementInputs), []);
    } finally { await page.close(); }
  });

  it("retains a completed range endpoint while its native opposite is still incomplete", async () => {
    const { createHydratedScene, sceneNode } = await import("@looma-test/scene");
    const { renderSceneToString } = await import("@looma-test/scene");
    const { UiDateRangePicker: DateRangePicker } = await import("@looma-test/components");
    const props = { value: { start: "2026-10-10", end: "2026-10-15" }, startName: "from", endName: "to", startInputId: "partial-start", endInputId: "partial-end", today: "2026-10-30", locale: "en-GB" };
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode("form", [sceneNode(DateRangePicker, props)]) }));
    const path = await bundle("partial-range-before-hydration", `
      import { createHydratedScene, sceneNode } from "@looma-test/scene";
      import { UiDateRangePicker as DateRangePicker } from '@looma-test/components';
      createHydratedScene({ render: () => sceneNode('form', [sceneNode(DateRangePicker, ${JSON.stringify(props)})]) }).mount('#app');
    `);
    const page = await open(path, `<div id="app">${html}</div>`, [join(root, "tokens.css")], {}, undefined, async page => {
      await page.locator('#partial-start').fill("2026-10-12");
      await page.locator('#partial-end').fill("");
      await page.locator('#partial-end').press("1");
      assert.equal(await page.locator('#partial-end').evaluate(input => (input as HTMLInputElement).validity.badInput), true);
    });
    try {
      await expect.poll(() => page.locator('#partial-end').getAttribute("data-date-fallback")).toBe("");
      await page.locator('#partial-end').fill("2026-10-20");
      await page.waitForFunction(() => new FormData(document.querySelector('form')!).get('to') === "2026-10-20");
      assert.deepEqual(await page.locator("form").evaluate(form => [...new FormData(form as HTMLFormElement)]), [["from", "2026-10-12"], ["to", "2026-10-20"]]);
    } finally { await page.close(); }
  });

  it("keeps an unfinished native date editable until its segments are complete", async () => {
    const { createHydratedScene, sceneNode } = await import("@looma-test/scene");
    const { renderSceneToString } = await import("@looma-test/scene");
    const { UiDatePicker: DatePicker } = await import("@looma-test/components");
    const props = { name: "due", inputId: "partial-due", value: "2026-10-30", today: "2026-10-30", locale: "en-GB" };
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode("form", [sceneNode(DatePicker, props)]) }));
    const path = await bundle("partial-date-before-hydration", `
      import { createHydratedScene, sceneNode } from "@looma-test/scene";
      import { UiDatePicker as DatePicker } from '@looma-test/components';
      createHydratedScene({ render: () => sceneNode('form', [sceneNode(DatePicker, ${JSON.stringify(props)})]) }).mount('#app');
    `);
    const page = await open(path, `<div id="app">${html}</div>`, [join(root, "tokens.css")], {}, undefined, async page => {
      await page.locator('#partial-due').fill("");
      await page.locator('#partial-due').press("1");
      assert.equal(await page.locator('#partial-due').evaluate(input => (input as HTMLInputElement).validity.badInput), true);
      await page.evaluate(() => { (window as any).partialDateInput = document.querySelector('#partial-due'); });

    });
    try {
      await expect.poll(() => page.locator('[data-date-fallback]').first().isVisible()).toBe(true);
      assert.equal(await page.locator('form').evaluate(form => (form as HTMLFormElement).checkValidity()), false);
      assert.equal(await page.evaluate(() => document.querySelector('[data-date-fallback]') === (window as any).partialDateInput), true);
      await page.locator('#partial-due').fill("2026-11-02");
      await page.waitForFunction(() => document.querySelector<HTMLInputElement>('[data-picker-field] [data-date-editor]')?.hidden === false);
      await page.waitForFunction(() => new FormData(document.querySelector('form')!).get('due') === "2026-11-02");
      await page.locator('[data-picker-trigger]').click();
      await page.waitForFunction(() => document.querySelector('[data-calendar-month-toggle]')?.textContent?.includes("November"));
    } finally { await page.close(); }
  });

  for (const adapter of ["HTML", "Converted"] as const) it(`preserves native Input edits through ${adapter} upgrade, reset and reconnection`, async () => {
    const { createHydratedScene, sceneNode } = await import("@looma-test/scene");
    const { renderSceneToString } = await import("@looma-test/scene");
    const { UiInput: Input } = await import("@looma-test/components");
    const props = { id: "initial-input", name: "title", value: "Draft" };
    let html;
    if (adapter === "Converted") html = await renderSceneToString(createHydratedScene({ render: () => sceneNode("form", [sceneNode(Input, props)]) }));
    else {
      const { renderComponents } = await import("@nextwebwg/html-next/server");
      const { definitions } = await import("../../dist/index.js");
      html = (await renderComponents('<form><ui-input id="initial-input" name="title" value="Draft"></ui-input></form>', { definitions })).html;
    }
    const path = await bundle(`input-before-hydration-${adapter}`, adapter === "Converted" ? `
      import { createHydratedScene, sceneNode, stateObject } from "@looma-test/scene";
      import { UiInput as Input } from '@looma-test/components';
      const props = stateObject(${JSON.stringify(props)});
      window.updateNativeInput = value => props.value = value;
      createHydratedScene({ render: () => sceneNode('form', [sceneNode(Input, props)]) }).mount('#app');
    ` : `
      import '@looma-test/runtime';
      import { componentRegistry } from '@nextwebwg/html-next/runtime';
      const input = document.querySelector('#initial-input');
      window.updateNativeInput = value => componentRegistry.update(input, { value });
    `);
    const page = await open(path, `<div id="app">${html}</div>`, [join(root, "tokens.css")], {}, undefined,
      page => page.locator('#initial-input').fill("Typed"));
    try {
      await expect.poll(() => page.locator('#initial-input').inputValue()).toBe("Typed");
      await page.locator('form').evaluate(form => (form as HTMLFormElement).reset());
      await expect.poll(() => page.locator('#initial-input').inputValue()).toBe("Draft");
      await page.evaluate(() => (window as any).updateNativeInput("Replacement"));
      await page.waitForFunction(() => document.querySelector<HTMLInputElement>('#initial-input')?.value === "Replacement");
      await page.locator('#initial-input').fill("Later");
      await page.locator('#initial-input').evaluate(input => { (window as any).detachedInput = input; input.remove(); });
      await page.waitForTimeout(25);
      await page.evaluate(() => document.querySelector('form')!.append((window as any).detachedInput));
      await page.waitForTimeout(25);
      await expect.poll(() => page.locator('#initial-input').inputValue()).toBe("Later");
      await page.locator('#initial-input').evaluate(input => input.remove());
      await page.waitForTimeout(25);
      await page.evaluate(() => (window as any).updateNativeInput("Fresh"));
      await page.evaluate(() => document.querySelector('form')!.append((window as any).detachedInput));
      await page.waitForFunction(() => document.querySelector<HTMLInputElement>('#initial-input')?.value === "Fresh");
    } finally { await page.close(); }
  });

  for (const endpoint of ["time", "start", "end"] as const) it(`coordinates a native ${endpoint} edit with its picker before converted hydration`, async () => {
    const { createHydratedScene, sceneNode } = await import("@looma-test/scene");
    const { renderSceneToString } = await import("@looma-test/scene");
    const name = endpoint === "time" ? "TimePicker" : "DateRangePicker";
    const Component = (await import("@looma-test/components"))[`Ui${name}`];
    const props = endpoint === "time" ? { name: "time", inputId: "pre-time", value: "14:30", locale: "en-GB" }
      : { value: { start: "2026-10-10", end: "2026-10-15" }, startName: "from", endName: "to", startInputId: "pre-start", endInputId: "pre-end", today: "2026-10-30", locale: "en-GB" };
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode("form", [sceneNode(Component, props)]) }));
    const path = await bundle(`before-hydration-${endpoint}`, `
      import { createHydratedScene, sceneNode } from "@looma-test/scene";
      import { Ui${name} as ${name} } from '@looma-test/components';
      createHydratedScene({ render: () => sceneNode('form', [sceneNode(${name}, ${JSON.stringify(props)})]) }).mount('#app');
    `);
    const next = endpoint === "time" ? "20:45" : endpoint === "start" ? "2026-10-20" : "2026-10-05";
    const page = await open(path, `<div id="app">${html}</div>`, [join(root, "tokens.css")], {}, undefined,
      page => page.locator(`#pre-${endpoint}`).fill(next));
    try {
      const trigger = endpoint === "time" ? '[data-time-trigger]' : `[data-range-trigger="${endpoint}"]`;
      await page.waitForFunction(selector => document.querySelector<HTMLButtonElement>(selector)?.hidden === false, trigger);
      const expected = endpoint === "time" ? [["time", next]] : [["from", next], ["to", next]];
      assert.deepEqual(await page.locator("form").evaluate(form => [...new FormData(form as HTMLFormElement)]), expected);
      await page.locator(trigger).click();
      if (endpoint === "time") await expect.poll(() => page.locator('[data-time-hour]').inputValue()).toBe("20");
      else assert.equal(await page.locator(`[data-calendar-day="${next}"]`).evaluate(node => node.parentElement!.getAttribute("aria-selected")), "true");
    } finally { await page.close(); }
  });

  it("preserves a date typed into the native fallback before converted hydration", async () => {
    const { createHydratedScene, sceneNode } = await import("@looma-test/scene");
    const { renderSceneToString } = await import("@looma-test/scene");
    const { UiDatePicker: DatePicker } = await import("@looma-test/components");
    const props = { name: "due", inputId: "pre-due", value: "2026-10-30", today: "2026-10-30", locale: "en-GB" };
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode("form", [sceneNode(DatePicker, props)]) }));
    const path = await bundle("date-before-hydration", `
      import { createHydratedScene, sceneNode } from "@looma-test/scene";
      import { UiDatePicker as DatePicker } from '@looma-test/components';
      createHydratedScene({ render: () => sceneNode('form', [sceneNode(DatePicker, ${JSON.stringify(props)})]) }).mount('#app');
    `);
    const page = await open(path, `<div id="app">${html}</div>`, [join(root, "tokens.css")], {}, undefined,
      async page => {
        await page.locator('#pre-due').fill("2026-11-02");

      });
    try {
      await page.waitForFunction(() => document.querySelector<HTMLButtonElement>('[data-picker-trigger]')?.hidden === false);
      assert.deepEqual(await page.locator("form").evaluate(form => [...new FormData(form as HTMLFormElement)]), [["due", "2026-11-02"]]);
      await expect.poll(() => page.locator('[data-picker-field] [data-date-editor]').inputValue()).toBe("02/11/2026");
      await page.locator('[data-picker-trigger]').click();
      await page.waitForFunction(() => document.querySelector('[data-calendar-month-toggle]')?.textContent?.includes("November"));
      await expect.poll(() => page.locator('[data-calendar-day="2026-11-02"]').evaluate(node => node.parentElement!.getAttribute("aria-selected"))).toBe("true");
    } finally { await page.close(); }
  });

  it("hydrates automatically prepared Calendar and picker grids without replacing their SSR dates", async () => {
    const { createHydratedScene, sceneNode } = await import("@looma-test/scene");
    const { renderSceneToString } = await import("@looma-test/scene");
    const [{ default: Calendar }, { default: DatePicker }, { default: DateRangePicker }] = await Promise.all([
      import("@looma-test/components").then(m => ({ default: m.UiCalendar })), import("@looma-test/components").then(m => ({ default: m.UiDatePicker })), import("@looma-test/components").then(m => ({ default: m.UiDateRangePicker })),
    ]);
    const calendar = { id: "calendar", value: "2024-02-29", today: "2024-02-12", locale: "en-GB" };
    const picker = { id: "picker", name: "due", inputId: "due-date", value: "2026-10-30", today: "2026-10-30", locale: "en-GB" };
    const range = { id: "range", value: { start: "2026-10-15", end: "2026-10-18" }, startName: "from", endName: "to", startInputId: "range-start", endInputId: "range-end", today: "2026-10-30", locale: "en-GB" };
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode("form", [sceneNode(Calendar, calendar), sceneNode(DatePicker, picker), sceneNode(DateRangePicker, range)]) }));
    const path = await bundle("date-framework-hydration", `
      import { createHydratedScene, sceneNode, stateObject } from "@looma-test/scene";
      import { UiCalendar as Calendar, UiDatePicker as DatePicker, UiDateRangePicker as DateRangePicker } from '@looma-test/components';
      const calendar = stateObject(${JSON.stringify(calendar)});
      const picker = stateObject(${JSON.stringify(picker)});
      const range = stateObject(${JSON.stringify(range)});
      window.dateServerNodes = [...document.querySelectorAll('[data-calendar-day]')];
      window.dateHydration = { calendar, picker, range };
      const app = createHydratedScene({ render: () => sceneNode('form', [sceneNode(Calendar, calendar), sceneNode(DatePicker, picker), sceneNode(DateRangePicker, range)]) });
      app.onWarning = message => console.error(message);
      app.mount('#app');
    `, "development");
    const errors: string[] = [];
    const page = await open(path, `<div id="app">${html}</div>`, [join(root, "tokens.css"), join(root, "theme-light.css")], {}, async page => {
      page.on("console", message => { if (message.type() === "warning" || message.type() === "error") errors.push(message.text()); });

    });
    try {
      await page.waitForFunction(() => document.querySelector<HTMLButtonElement>('[data-picker-trigger]')?.hidden === false);
      await expect.poll(() => page.locator('[data-calendar-day]').count()).toBe(126);
      assert.equal(await page.evaluate(() => [...document.querySelectorAll('[data-calendar-day]')].every((node, index) => node === (window as any).dateServerNodes[index])), true);
      await expect.poll(() => page.locator('[data-html-next-bindings]').count(), { message: "transfer metadata is consumed after hydration" }).toBe(0);
      assert.deepEqual(await page.locator("form").evaluate(form => [...new FormData(form as HTMLFormElement)]), [["due", "2026-10-30"], ["from", "2026-10-15"], ["to", "2026-10-18"]]);
      await page.evaluate(() => { (window as any).dateHydration.calendar.value = "2024-03-12"; });
      await page.waitForFunction(() => document.querySelector('#calendar [data-calendar-month-toggle]')?.textContent?.includes("March"));
      await page.locator('#picker [data-picker-trigger]').click();
      await page.locator('#picker [data-calendar-day="2026-10-31"]').click();
      await page.waitForFunction(() => new FormData(document.querySelector('form')!).get('due') === "2026-10-31");
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });
});
