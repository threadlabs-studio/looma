import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Small pill button and small menu", () => {
  it("draws an xs pill at 24px with fully rounded ends", async () => {
    const path = await bundle("html-button-xs-pill", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-button id="xs" variant="ghost" tone="neutral" size="xs" shape="pill">On track</ui-button>
      <ui-button id="sm" size="sm">Small</ui-button>`, [join(root, "tokens.css"), join(root, "theme-light.css")]);
    await page.waitForSelector('#xs:is([component~="ui-button"], [data-component~="ui-button"], .ui-button, [ui-button])');
    const xs = await page.evaluate(() => {
      const button = document.querySelector<HTMLElement>("#xs")!;
      const style = getComputedStyle(button);
      return { height: button.getBoundingClientRect().height, radius: parseFloat(style.borderTopLeftRadius), font: parseFloat(style.fontSize) };
    });
    const smFont = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("#sm")!).fontSize));
    assert.equal(xs.height, 24);
    const padding = await page.evaluate(() => { const style = getComputedStyle(document.querySelector("#xs")!); return [style.paddingTop, style.paddingLeft]; });
    assert.deepEqual(padding, ["3px", "5px"], "an avatar inside the pill keeps a pixel of room from its edge");
    assert.ok(xs.radius >= xs.height / 2, `pill radius ${xs.radius}px rounds the ends fully`);
    assert.ok(xs.font < smFont, "xs text is smaller than sm text");
    await page.close();
  });

  it("holds an open menu's ghost trigger stronger than its hover", async () => {
    const path = await bundle("html-ghost-open", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-button id="hovered" variant="ghost" tone="neutral">Hovered</ui-button>
      <ui-button id="open" variant="ghost" tone="neutral" aria-expanded="true">Open</ui-button>`, [join(root, "tokens.css"), join(root, "theme-light.css")]);
    await page.waitForSelector('#open:is([component~="ui-button"], [data-component~="ui-button"], .ui-button, [ui-button])');
    await page.hover("#hovered");
    await page.waitForTimeout(300);
    const lightness = (id: string) => page.evaluate((selector) => {
      const canvas = document.createElement("canvas").getContext("2d")!;
      canvas.fillStyle = "white";
      canvas.fillRect(0, 0, 1, 1);
      canvas.fillStyle = getComputedStyle(document.querySelector(selector)!).backgroundColor;
      canvas.fillRect(0, 0, 1, 1);
      const [r, g, b] = canvas.getImageData(0, 0, 1, 1).data;
      return r + g + b;
    }, id);
    assert.ok(await lightness("#open") < await lightness("#hovered"), "the open trigger is stronger than hover");
    await page.close();
  });

  it("sizes a small menu's rows and checks the chosen radio item", async () => {
    const path = await bundle("html-menu-sm", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-menu id="sm" inline size="sm" aria-label="Stage">
        <ui-menu-item type="radio" value="early">Early</ui-menu-item>
        <ui-menu-item type="radio" value="on" checked>On track</ui-menu-item>
      </ui-menu>
      <ui-menu id="md" inline aria-label="Standard">
        <ui-menu-item value="a">Standard</ui-menu-item>
      </ui-menu>`, [join(root, "tokens.css"), join(root, "theme-light.css")]);
    await page.waitForSelector('#md :is([component~="ui-menu-item"], [data-component~="ui-menu-item"], .ui-menu-item, [ui-menu-item])');
    const row = (selector: string) => page.evaluate((target) => {
      const item = document.querySelector<HTMLElement>(target)!;
      return { height: item.getBoundingClientRect().height, font: parseFloat(getComputedStyle(item).fontSize) };
    }, selector);
    const [small, standard] = [await row('#sm :is([component~="ui-menu-item"], [data-component~="ui-menu-item"], .ui-menu-item, [ui-menu-item])'), await row('#md :is([component~="ui-menu-item"], [data-component~="ui-menu-item"], .ui-menu-item, [ui-menu-item])')];
    assert.ok(small.height < standard.height, `small rows (${small.height}px) are shorter than standard (${standard.height}px)`);
    assert.ok(small.font < standard.font, "small rows use smaller text");
    const widths = await page.evaluate(() => ["#sm", "#md"].map((id) => document.querySelector(id)!.getBoundingClientRect().width));
    assert.ok(widths[0]! < widths[1]!, `a small menu (${widths[0]}px) is narrower than a standard one (${widths[1]}px)`);
    const checks = await page.evaluate(() => [...document.querySelectorAll('#sm :is([component~="ui-menu-item"], [data-component~="ui-menu-item"], .ui-menu-item, [ui-menu-item])')]
      .map((item) => Boolean(item.querySelector(".indicator svg"))));
    assert.deepEqual(checks, [false, true]);
    await page.close();
  });
});
