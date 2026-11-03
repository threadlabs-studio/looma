import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Combobox selectedValues", () => {
  // `selectedValues` controls a multiple combobox: it sets the chips, the user's changes are reported as the
  // new list (update:selectedValues in converted output), and setting it reports nothing. A consumer that does not take a
  // change keeps its chips.
  const check = async (page: Page) => {
    const settle = () => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    const chips = (id: string) => page.locator(`#${id} .item`).evaluateAll((items) => items.map((item) => item.getAttribute("aria-label")));
    const labelled = (...labels: string[]) => labels.map((label) => `${label}, press Delete or Backspace to remove`);
    const reports = () => page.evaluate(() => (window as unknown as { reports: string[][] }).reports);
    const entries = () => page.locator("#form").evaluate((form) => Array.from(new FormData(form as HTMLFormElement), ([name, value]) => [name, String(value)]));
    const valid = () => page.locator("#form").evaluate((form) => (form as HTMLFormElement).checkValidity());
    const input = page.locator('#teams input[role="combobox"]');
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await input.waitFor();
    await settle();

    // Initial values render as labelled chips, submit their values, and satisfy required.
    assert.deepEqual(await chips("teams"), labelled("Docs"));
    assert.deepEqual(await entries(), [["teams", "docs"]]);
    assert.equal(await valid(), true);

    // Pointer adds, Backspace from the empty input removes the last, Delete on a chip removes it.
    await input.fill("Des");
    await page.locator('#teams [role="option"]').filter({ hasText: "Design" }).click();
    await settle();
    assert.deepEqual(await chips("teams"), labelled("Docs", "Design"));
    await expect.poll(() => page.locator('#teams [role="option"][aria-selected="true"]').allInnerTexts()).toStrictEqual(["Design", "Docs"]);
    await page.keyboard.press("Backspace");
    await settle();
    assert.deepEqual(await chips("teams"), labelled("Docs"));
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Delete");
    await settle();
    assert.deepEqual(await chips("teams"), []);
    assert.deepEqual(await reports(), [["docs", "design"], ["docs"], []]);
    assert.deepEqual(await entries(), []);
    assert.equal(await valid(), false, "required, with nothing chosen");

    // An external change updates the chips and the form without reporting a change.
    await page.evaluate(() => (window as unknown as { setValues: (values: string[]) => void }).setValues(["design", "platform"]));
    await settle();
    assert.deepEqual(await chips("teams"), labelled("Design", "Platform"));
    assert.deepEqual(await entries(), [["teams", "design"], ["teams", "platform"]]);
    assert.equal(await valid(), true);
    assert.equal((await reports()).length, 3);
    // A reset returns to the values the consumer set.
    await page.locator("#form").evaluate((form) => (form as HTMLFormElement).reset());
    await settle();
    assert.deepEqual(await chips("teams"), labelled("Design", "Platform"));

    // A repeated value shows one chip and submits once; the chips and hidden inputs are keyed by value.
    await page.evaluate(() => (window as unknown as { setValues: (values: string[]) => void }).setValues(["design", "design", "platform"]));
    await settle();
    assert.deepEqual(await chips("teams"), labelled("Design", "Platform"));
    assert.deepEqual(await entries(), [["teams", "design"], ["teams", "platform"]]);
    // Typing a label already chosen and a separator clears the text without adding it again.
    await input.fill("design");
    await page.keyboard.press(",");
    await settle();
    await expect.poll(() => input.inputValue()).toBe("");
    assert.deepEqual(await chips("teams"), labelled("Design", "Platform"));
    assert.equal((await reports()).length, 3);
    assert.deepEqual(errors, []);

    // The consumer that ignores the change keeps its chips.
    await page.locator('#fixed input[role="combobox"]').focus();
    await page.keyboard.press("Backspace");
    await settle();
    assert.deepEqual(await chips("fixed"), labelled("Docs"));
  };
  const options = `<option value="design">Design</option><option value="docs">Docs</option><option value="platform">Platform</option>`;

  it("follows selectedValues and reports the user's changes in HTML", async () => {
    const path = await bundle("html-combobox-selected-values", `
      import "@looma-test/runtime";
      import { componentRegistry } from "@nextwebwg/html-next/runtime";
      window.reports = [];
      const teams = () => document.querySelector("#teams");
      // A rendered component's data-* attributes only record its options; the prop channel sets them.
      window.setValues = (values) => componentRegistry.update(teams(), { selectedValues: values });
      document.addEventListener("selected-values-change", (event) => {
        if (event.target !== teams()) return;
        window.reports.push(event.detail.selectedValues);
        window.setValues(event.detail.selectedValues);
      });
    `);
    const page = await open(path, `
      <form id="form">
        <ui-combobox id="teams" name="teams" label="Teams" multiple required token-separators='[","]' selected-values='["docs"]'>${options}</ui-combobox>
        <ui-combobox id="fixed" label="Fixed" multiple selected-values='["docs"]'>${options}</ui-combobox>
      </form>
    `, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("binds v-model:selectedValues in converted output", async () => {
    const path = await bundle("converted-combobox-selected-values", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiCombobox as Combobox } from "@looma-test/components";
      const selected = createState(["docs"]);
      window.reports = [];
      window.setValues = (values) => { selected.value = values; };
      const options = () => [["design", "Design"], ["docs", "Docs"], ["platform", "Platform"]].map(([value, label]) => sceneNode("option", { value }, label));
      createScene({
        render: () => sceneNode("form", { id: "form" }, [
          sceneNode(Combobox, { id: "teams", name: "teams", label: "Teams", multiple: true, required: true, tokenSeparators: [","], selectedValues: selected.value,
            "bind:selectedValues": (values) => { window.reports.push(values); selected.value = values; } }, options),
          sceneNode(Combobox, { id: "fixed", label: "Fixed", multiple: true, selectedValues: ["docs"] }, options),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });
});
