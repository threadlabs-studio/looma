import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Radio group initial selection", () => {
  const check = async (page: Page) => {
    await page.waitForSelector('#plan input[value="pro"]');
    assert.deepEqual(await page.locator("#plan input").evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).checked)), [false, true], "the group's value takes precedence over a child's checked prop");
    assert.deepEqual(await page.locator("#empty input").evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).checked)), [false, false], "an empty group value checks no radio");
    assert.deepEqual(await page.locator("#plan input").evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).defaultChecked)), [false, true], "native reset defaults also belong to the group");
    await expect.poll(() => page.locator("#standalone input").isChecked(), { message: "an authored standalone checked radio stays checked" }).toBe(true);
    await page.locator('#plan input[value="free"]').check();
    await page.locator("#form").evaluate((form) => (form as HTMLFormElement).reset());
    await page.waitForFunction(() => (document.querySelector('#plan input[value="pro"]') as HTMLInputElement).checked);
    assert.deepEqual(await page.locator("#plan input").evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).checked)), [false, true], "form reset restores the group's authored value");
  };

  it("honors group selection when a child is authored checked, in HTML", async () => {
    const path = await bundle("html-radio-initial-selection", `import "@looma-test/runtime";`);
    const page = await open(path, `<form id="form">
      <ui-radio-group id="plan" name="plan" value="pro"><ui-radio value="free" checked>Free</ui-radio><ui-radio value="pro">Pro</ui-radio></ui-radio-group>
      <ui-radio-group id="empty" name="empty"><ui-radio value="free" checked>Free</ui-radio><ui-radio value="pro">Pro</ui-radio></ui-radio-group>
      <fieldset role="radiogroup"><ui-radio id="standalone" name="standalone" checked>Standalone</ui-radio></fieldset>
    </form>`, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("honors group selection when a child is authored checked, in converted output", async () => {
    const path = await bundle("converted-radio-initial-selection", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiRadio as Radio, UiRadioGroup as RadioGroup } from "@looma-test/components";
      const radios = () => [sceneNode(Radio, { value: "free", checked: true }, () => "Free"), sceneNode(Radio, { value: "pro" }, () => "Pro")];
      createScene({ render: () => sceneNode("form", { id: "form" }, [
        sceneNode(RadioGroup, { id: "plan", name: "plan", value: "pro" }, radios),
        sceneNode(RadioGroup, { id: "empty", name: "empty" }, radios),
        sceneNode("fieldset", { role: "radiogroup" }, [sceneNode(Radio, { id: "standalone", name: "standalone", checked: true }, () => "Standalone")]),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });
});
