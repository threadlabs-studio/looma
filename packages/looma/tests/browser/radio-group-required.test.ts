import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Radio group required", () => {
  // As on native radios: one required radio makes its whole group required.
  const check = async (page: Page) => {
    const group = page.locator('#plan[role="radiogroup"]');
    await group.waitFor();
    await expect.poll(() => group.getAttribute("aria-required")).toBe("true");
    assert.deepEqual(await page.locator("#plan input").evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).required)), [true, true]);
    const valid = () => page.locator("#form").evaluate((form) => (form as HTMLFormElement).checkValidity());
    assert.equal(await valid(), false, "nothing chosen");
    await page.locator('#plan input[value="pro"]').check();
    assert.equal(await valid(), true);
    await expect.poll(() => page.locator('#optional[role="radiogroup"]').getAttribute("aria-required")).toBe("false");
    assert.deepEqual(await page.locator("#optional input").evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).required)), [false, true]);
  };

  it("marks the group required and its radios required, in HTML", async () => {
    const path = await bundle("html-radio-required", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <form id="form">
        <ui-radio-group id="plan" name="plan" label="Plan" required><ui-radio value="free">Free</ui-radio><ui-radio value="pro">Pro</ui-radio></ui-radio-group>
        <ui-radio-group id="optional" name="optional" label="Optional" value="b"><ui-radio value="a">A</ui-radio><ui-radio value="b" required>B</ui-radio></ui-radio-group>
      </form>
    `, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("marks the group required and its radios required, in converted output", async () => {
    const path = await bundle("converted-radio-required", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiRadio as Radio, UiRadioGroup as RadioGroup } from "@looma-test/components";
      createScene({
        render: () => sceneNode("form", { id: "form" }, [
          sceneNode(RadioGroup, { id: "plan", name: "plan", label: "Plan", required: true }, () => [sceneNode(Radio, { value: "free" }, () => "Free"), sceneNode(Radio, { value: "pro" }, () => "Pro")]),
          sceneNode(RadioGroup, { id: "optional", name: "optional", label: "Optional", value: "b" }, () => [sceneNode(Radio, { value: "a" }, () => "A"), sceneNode(Radio, { value: "b", required: true }, () => "B")]),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });
});
