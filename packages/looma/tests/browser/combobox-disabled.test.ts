import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Combobox disabled", () => {
  // Every part the user can press follows disabled: the clear, disclosure, help, and badge buttons.
  const check = async (page: Page) => {
    const locked = page.locator("#locked");
    await locked.locator('[data-combobox-action="clear"]').waitFor();
    const buttons = await locked.locator("button").evaluateAll((all) => all.map((button) =>
      [button.getAttribute("data-combobox-action") ?? button.className, (button as HTMLButtonElement).disabled]));
    assert.deepEqual(buttons, [["item", true], ["clear", true], ["disclosure", true], ["help", true]]);
    // Even a click that reaches the clear button (a script, or a stale reference) changes nothing.
    await locked.locator('[data-combobox-action="clear"]').evaluate((button) => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await page.locator("#single").locator('[data-combobox-action="clear"]').evaluate((button) => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await expect.poll(() => page.locator('#single input[role="combobox"]').inputValue()).toBe("Apple");
    assert.deepEqual(await page.evaluate(() => (window as unknown as { changes: unknown[] }).changes), []);
  };
  const options = `<option value="apple">Apple</option><option value="pear">Pear</option>`;

  it("cannot be cleared or opened in HTML", async () => {
    const path = await bundle("html-combobox-disabled", `
      import "@looma-test/runtime";
      window.changes = [];
      document.addEventListener("value-change", (event) => window.changes.push(event.detail));
    `);
    const page = await open(path, `
      <ui-combobox id="locked" label="Tags" multiple clearable disclosure help="Pick tags." disabled items='[{"id":"apple","value":"apple","label":"Apple"}]'>${options}</ui-combobox>
      <ui-combobox id="single" label="Fruit" value="apple" clearable disabled>${options}</ui-combobox>
    `, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("cannot be cleared or opened in converted output", async () => {
    const path = await bundle("converted-combobox-disabled", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiCombobox as Combobox } from "@looma-test/components";
      window.changes = [];
      const options = () => [sceneNode("option", { value: "apple" }, "Apple"), sceneNode("option", { value: "pear" }, "Pear")];
      const onValueChange = (event) => window.changes.push(event.detail);
      createScene({
        render: () => sceneNode("div", [
          sceneNode(Combobox, { id: "locked", label: "Tags", multiple: true, clearable: true, disclosure: true, help: "Pick tags.", disabled: true,
            items: [{ id: "apple", value: "apple", label: "Apple" }], onValueChange }, options),
          sceneNode(Combobox, { id: "single", label: "Fruit", value: "apple", clearable: true, disabled: true, onValueChange }, options),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });
});
