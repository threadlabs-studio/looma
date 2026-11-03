import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("HTML components", () => {
  it("register and lower from dist/index.js", async () => {
    const path = await bundle("html-page", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-button id="save" variant="solid" class="consumer">Save</ui-button>
      <ui-switch id="alerts">Alerts</ui-switch>
      <ui-disclosure id="more" summary="More"><p>Details</p></ui-disclosure>
      <ui-form-field><label slot="label" id="field-label" for="field">Name</label><input id="field"></ui-form-field>
    `, [join(root, "tokens.css")]);
    await page.waitForSelector('#save:is([component~="ui-button"], [data-component~="ui-button"], .ui-button, [ui-button])');
    const button = page.locator("#save");
    assert.equal(await button.evaluate((element) => element.localName), "button");
    await expect.poll(() => button.getAttribute("class")).toBe("consumer");
    assert.notEqual(await button.evaluate((element) => getComputedStyle(element).backgroundColor), "rgba(0, 0, 0, 0)");

    await page.locator("#alerts input").click();
    await expect.poll(() => page.locator("#alerts input").isChecked()).toBe(true);

    const trigger = page.locator("#more .trigger");
    await expect.poll(() => trigger.getAttribute("aria-expanded")).toBe("false");
    await trigger.click();
    await expect.poll(() => trigger.getAttribute("aria-expanded")).toBe("true");

    await page.waitForSelector(':is([component~="ui-form-field"], [data-component~="ui-form-field"], .ui-form-field, [ui-form-field])');
    assert.equal(await page.locator("#field-label").evaluate((element) => getComputedStyle(element).fontSize), "16px");
    await page.close();
  });
});
