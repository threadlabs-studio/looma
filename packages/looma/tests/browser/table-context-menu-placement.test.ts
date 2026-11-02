import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Table context menu placement", () => {
  // Owner model: a menu is shown at the place it is written and travels with that place; only a
  // menu written in a fixed or absolutely positioned box, as LoomaEditor places it, answers to the viewport.
  it("shows a menu at its written place and keeps a floating menu inside the viewport", async () => {
    const path = await bundle("html-table-context-menu", `import "@looma-test/runtime";`);
    const actions = `actions='["add-row-before","add-row-after","add-column-before","add-column-after","delete-table"]'`;
    const page = await open(path, `
      <div style="height: 1500px"></div>
      <div id="stage" style="position: relative; overflow: auto; padding: 20px">
        <ui-editor-table-context-menu id="inline" ${actions} open></ui-editor-table-context-menu>
      </div>
      <div style="height: 1500px"></div>
      <div style="position: fixed; top: 560px; left: 1000px">
        <ui-editor-table-context-menu id="floating" ${actions} open></ui-editor-table-context-menu>
      </div>
    `, [join(root, "tokens.css")], { viewport: { width: 1100, height: 600 } });
    await page.waitForFunction(() => document.querySelector<HTMLElement>("#floating")?.style.translate);
    const frames = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    // Offset from the written place: the stage's padding edge, whatever the scroll or viewport.
    const offset = () => page.locator("#inline").evaluate((element) => {
      const menu = element.getBoundingClientRect();
      const stage = element.parentElement!.getBoundingClientRect();
      return { x: menu.left - stage.left, y: menu.top - stage.top };
    });
    // A resize re-measures, as a full-page capture or a rotated phone does; the place below the fold stays put.
    await page.setViewportSize({ width: 1100, height: 640 });
    await frames();
    assert.deepEqual(await offset(), { x: 20, y: 20 }, "below the first screen, the menu is not pulled into the viewport");
    await page.evaluate(() => scrollTo(0, 1300));
    await frames();
    assert.deepEqual(await offset(), { x: 20, y: 20 }, "the menu travels with its place as the page scrolls");
    // Content above the place grows without a scroll or resize event, as fonts or lazy content do.
    await page.evaluate(() => document.querySelector("#stage")!.insertAdjacentHTML("beforebegin", '<div style="height: 100px"></div>'));
    await frames();
    assert.deepEqual(await offset(), { x: 20, y: 20 }, "the menu follows layout that moves its place");
    const floating = await page.locator("#floating").boundingBox();
    assert.ok(floating && floating.x + floating.width <= 1100 - 12 && floating.y + floating.height <= 640 - 12, `floating menu fits the viewport: ${JSON.stringify(floating)}`);
    await page.close();
  });

  it("separates sections only between them and fits fewer swatches to a row in a narrow menu", async () => {
    const path = await bundle("html-table-context-menu-sections", `import "@looma-test/runtime";`);
    const swatches = `actions='["background-none","background-gray","background-yellow","background-blue","background-green","background-red","add-row-after","delete-table"]'`;
    const page = await open(path, `
      <ui-editor-table-context-menu id="plain" actions='["add-row-after","delete-table"]' open></ui-editor-table-context-menu>
      <div style="position: fixed; top: 0; right: 0"><ui-editor-table-context-menu id="full" ${swatches} open></ui-editor-table-context-menu></div>
    `, [join(root, "tokens.css")]);
    await page.waitForFunction(() => document.querySelectorAll("#full .swatch-button").length === 6);
    const layout = (id: string) => page.locator(`#${id}`).evaluate((element) => {
      const buttons = [...element.querySelectorAll(".swatch-button")].map((button) => button.getBoundingClientRect());
      return {
        width: element.getBoundingClientRect().width,
        separators: [...element.querySelectorAll(".sep")].map((sep) => getComputedStyle(sep).display !== "none"),
        perRow: buttons.filter((button) => button.top === buttons[0]?.top).length,
        narrowest: Math.round(Math.min(...buttons.map((button) => button.width))),
      };
    });
    assert.deepEqual((await layout("plain")).separators, [false, true], "no separator above the first section");
    const full = await layout("full");
    assert.deepEqual({ width: full.width, separators: full.separators, perRow: full.perRow }, { width: 272, separators: [true, true], perRow: 3 });
    // A phone viewport narrows the menu to 100vw - 24px; its labels stay whole by fitting fewer to a row.
    await page.setViewportSize({ width: 251, height: 720 });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const narrow = await layout("full");
    assert.deepEqual({ width: narrow.width, perRow: narrow.perRow, narrowest: narrow.narrowest }, { width: 227, perRow: 2, narrowest: 80 });
    await page.close();
  });
});
