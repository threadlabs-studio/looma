import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Choice invalid states", () => {
  const verify = async (page: Page) => {
    const checkbox = page.locator("#terms input");
    const group = page.locator('#choice [role="radiogroup"], #choice[role="radiogroup"]').first();
    await expect.poll(() => checkbox.getAttribute("aria-invalid")).toBe("true");
    await expect.poll(() => group.getAttribute("aria-invalid")).toBe("true");
    assert.equal(await checkbox.evaluate((element) => getComputedStyle(element).borderTopColor), "rgb(146, 36, 64)");
    assert.equal(await page.locator("#choice legend").evaluate((element) => getComputedStyle(element).color), "rgb(146, 36, 64)");
  };

  it("exposes and styles invalid choices in HTML", async () => {
    const path = await bundle("html-invalid-choices", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <div style="--ui-field-danger: rgb(146, 36, 64)">
        <ui-checkbox id="terms" invalid>Accept terms</ui-checkbox>
        <ui-radio-group id="choice" label="Choose" invalid><ui-radio value="one">One</ui-radio></ui-radio-group>
      </div>
    `, [join(root, "tokens.css")]);
    await verify(page);
    await page.close();
  });

  it("exposes and styles invalid choices in converted output", async () => {
    const path = await bundle("converted-invalid-choices", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiCheckbox as Checkbox, UiRadio as Radio, UiRadioGroup as RadioGroup } from "@looma-test/components";
      createScene({ render: () => sceneNode("div", { style: "--ui-field-danger: rgb(146, 36, 64)" }, [
        sceneNode(Checkbox, { id: "terms", invalid: true }, () => "Accept terms"),
        sceneNode(RadioGroup, { id: "choice", label: "Choose", invalid: true }, () => sceneNode(Radio, { value: "one" }, () => "One")),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await verify(page);
    await page.close();
  });
});
