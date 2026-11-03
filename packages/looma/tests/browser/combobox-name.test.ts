import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Combobox name", () => {
  // The form gets the chosen value, never the label shown in the field: one entry in single mode,
  // one per chosen item in multiple mode, the typed text when free text is allowed.
  const check = async (page: Page) => {
    await page.locator('#off input[role="combobox"]').waitFor();
    const entries = () => page.locator("#form").evaluate((form) =>
      Array.from(new FormData(form as HTMLFormElement), ([name, value]) => [name, String(value)]));
    const pick = async (id: string, label: string) => {
      await page.locator(`#${id} input[role="combobox"]`).fill(label.slice(0, 2));
      await page.locator(`#${id} [role="option"]`).filter({ hasText: label }).first().click();
    };
    assert.deepEqual(await entries(), [["fruit", ""], ["city", ""], ["country", "no"]]);
    await expect.poll(() => page.locator('#fruit input[role="combobox"]').getAttribute("name"), { message: "the visible text is not submitted" }).toBe(null);
    await pick("fruit", "Pear");
    await pick("tags", "Alpha");
    await pick("tags", "Beta");
    await page.locator('#city input[role="combobox"]').fill("Oslo");
    await expect.poll(() => page.locator('#fruit input[role="combobox"]').inputValue()).toBe("Pear");
    assert.deepEqual(await entries(), [["fruit", "pear"], ["tags", "alpha"], ["tags", "beta"], ["city", "Oslo"], ["country", "no"]]);
    await expect.poll(() => page.locator("#unnamed input").count(), { message: "an unnamed combobox adds no form field" }).toBe(1);
  };
  const fruit = `<option value="apple">Apple</option><option value="pear">Pear</option>`;
  const tags = `<option value="alpha">Alpha</option><option value="beta">Beta</option>`;

  it("submits the value, not the label, in HTML", async () => {
    const path = await bundle("html-combobox-name", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <form id="form">
        <ui-combobox id="fruit" name="fruit" label="Fruit">${fruit}</ui-combobox>
        <ui-combobox id="tags" name="tags" label="Tags" multiple>${tags}</ui-combobox>
        <ui-combobox id="city" name="city" label="City" allow-free-text></ui-combobox>
        <ui-combobox name="country" label="Country" value="no" readonly><option value="no">Norway</option></ui-combobox>
        <ui-combobox id="off" name="off" label="Off" value="apple" disabled>${fruit}</ui-combobox>
        <ui-combobox id="unnamed" label="Unnamed">${fruit}</ui-combobox>
      </form>
    `, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("submits the value, not the label, in converted output", async () => {
    const path = await bundle("converted-combobox-name", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiCombobox as Combobox } from "@looma-test/components";
      const list = (pairs) => () => pairs.map(([value, label]) => sceneNode("option", { value }, label));
      const fruit = list([["apple", "Apple"], ["pear", "Pear"]]);
      createScene({
        render: () => sceneNode("form", { id: "form" }, [
          sceneNode(Combobox, { id: "fruit", name: "fruit", label: "Fruit" }, fruit),
          sceneNode(Combobox, { id: "tags", name: "tags", label: "Tags", multiple: true }, list([["alpha", "Alpha"], ["beta", "Beta"]])),
          sceneNode(Combobox, { id: "city", name: "city", label: "City", allowFreeText: true }),
          sceneNode(Combobox, { name: "country", label: "Country", value: "no", readonly: true }, list([["no", "Norway"]])),
          sceneNode(Combobox, { id: "off", name: "off", label: "Off", value: "apple", disabled: true }, fruit),
          sceneNode(Combobox, { id: "unnamed", label: "Unnamed" }, fruit),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });
});
