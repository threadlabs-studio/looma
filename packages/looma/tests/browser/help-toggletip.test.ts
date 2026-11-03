import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Help toggletip", () => {
  it("sizes the help icon like any icon, and opens its tooltip from the keyboard", async () => {
    const path = await bundle("html-help-toggletip", `import "@looma-test/runtime";`);
    const svg = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14" /></svg>`;
    const page = await open(path, `
      <ui-icon-button id="help-sm" size="sm" variant="ghost" round label="Help for Email"><ui-icon name="help"></ui-icon></ui-icon-button>
      <ui-icon-button id="svg-sm" size="sm" label="Add">${svg}</ui-icon-button>
      <ui-icon-button id="help-md" variant="ghost" round label="Help for Name"><ui-icon name="help"></ui-icon></ui-icon-button>
      <ui-icon-button id="svg-md" label="Add">${svg}</ui-icon-button>
      <ui-tooltip id="tip" for="help-sm" trigger="click">Receipts go to this address.</ui-tooltip>
    `, [join(root, "tokens.css")]);
    await page.waitForSelector('#help-md :is([component~="ui-icon"], [data-component~="ui-icon"], .ui-icon, [ui-icon]) circle');
    const size = (selector: string) => page.locator(selector).evaluate((element) => {
      const { width, height } = element.getBoundingClientRect();
      return { width, height, stroke: getComputedStyle(element.querySelector("svg") ?? element).strokeWidth };
    });
    await expect.poll(() => page.locator('#help-md :is([component~="ui-icon"], [data-component~="ui-icon"], .ui-icon, [ui-icon]) svg > g > *').count(), { message: "circle-help: a circle and two paths" }).toBe(3);
    assert.deepEqual(await size('#help-sm :is([component~="ui-icon"], [data-component~="ui-icon"], .ui-icon, [ui-icon])'), await size("#svg-sm svg"));
    assert.deepEqual(await size('#help-md :is([component~="ui-icon"], [data-component~="ui-icon"], .ui-icon, [ui-icon])'), await size("#svg-md svg"));
    assert.ok((await size('#help-sm :is([component~="ui-icon"], [data-component~="ui-icon"], .ui-icon, [ui-icon])')).width < (await size('#help-md :is([component~="ui-icon"], [data-component~="ui-icon"], .ui-icon, [ui-icon])')).width);

    const tip = page.locator("#tip");
    await page.locator("#help-sm").focus();
    await page.keyboard.press("Enter");
    await tip.waitFor({ state: "visible" });
    await expect.poll(() => page.locator("#help-sm").getAttribute("aria-expanded")).toBe("true");
    await expect.poll(() => page.locator("#help-sm").getAttribute("aria-label")).toBe("Help for Email");
    await page.keyboard.press("Escape");
    await tip.waitFor({ state: "hidden" });
    await page.close();
  });
});
