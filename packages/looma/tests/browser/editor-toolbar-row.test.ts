import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open, scrollFades } from "../renderers/browser-driver";

describe("Editor toolbar row", () => {
  it("has one Tab stop and roves through enabled controls in HTML and converted", async () => {
    const htmlPath = await bundle("html-toolbar-roving", `import "@looma-test/runtime";`);
    const vuePath = await bundle("converted-toolbar-roving", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiEditorToolbar as EditorToolbar } from "@looma-test/components";
      createScene({ render: () => sceneNode("div", [
        sceneNode("button", { id: "before" }, "Before"),
        sceneNode(EditorToolbar, { id: "toolbar" }, () => [
          sceneNode("button", { id: "first" }, "First"),
          sceneNode("button", { id: "blocked", disabled: true }, "Blocked"),
          sceneNode("button", { id: "last" }, "Last"),
        ]),
        sceneNode("button", { id: "after" }, "After"),
      ]) }).mount("#app");
    `);
    for (const [path, body, css] of [
      [htmlPath, `<button id="before">Before</button><ui-editor-toolbar id="toolbar"><button id="first">First</button><button id="blocked" disabled>Blocked</button><button id="last">Last</button></ui-editor-toolbar><button id="after">After</button>`, [join(root, "tokens.css")]],
      [vuePath, `<div id="app"></div>`, [join(root, "tokens.css")]],
    ] as const) {
      const page = await open(path, body, css);
      await expect.poll(() => page.locator("#toolbar button[tabindex='0']").count()).toBe(1);
      await page.locator("#before").focus();
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "first");
      await page.keyboard.press("ArrowRight");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "last");
      await page.keyboard.press("ArrowRight");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "first");
      await page.keyboard.press("End");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "last");
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "after");
      await page.close();
    }
  });

  const buttons = Array.from({ length: 18 }, (_, index) => `<button type="button">B${index}</button>`).join("");
  const fades = (page: Page) => scrollFades(page, "#toolbar .strip");
  const settle = (page: Page) => page.waitForTimeout(250);

  async function checkRow(page: Page) {
    const toolbar = page.locator("#toolbar");
    await toolbar.waitFor();
    await expect.poll(() => toolbar.getAttribute("role")).toBe("toolbar");
    const layout = await toolbar.evaluate((element) => {
      const strip = element.querySelector(".strip") as HTMLElement;
      const tops = [...element.querySelectorAll("button")].map((button) => Math.round(button.getBoundingClientRect().top));
      return { rows: new Set(tops).size, hidden: strip.scrollWidth - strip.clientWidth };
    });
    // Never wraps: one row that scrolls when it is too long.
    assert.equal(layout.rows, 1);
    assert.ok(layout.hidden > 0, "the narrow row overflows");
    await settle(page);
    assert.deepEqual(await fades(page), { start: "0", end: "1" }, "only the end hides controls at first");

    await toolbar.evaluate((element) => { const strip = element.querySelector(".strip")!; strip.scrollLeft = strip.scrollWidth; });
    await settle(page);
    assert.deepEqual(await fades(page), { start: "1", end: "0" }, "scrolled to the end, only the start hides controls");

    await toolbar.evaluate((element) => { const strip = element.querySelector(".strip")!; strip.scrollLeft = (strip.scrollWidth - strip.clientWidth) / 2; });
    await settle(page);
    assert.deepEqual(await fades(page), { start: "1", end: "1" }, "in the middle, both edges hide controls");

    await page.locator("#frame").evaluate((element) => { (element as HTMLElement).style.width = "3000px"; });
    await settle(page);
    assert.deepEqual(await fades(page), { start: "0", end: "0" }, "a row that fits shows no fade");
  }

  it("keeps one row that scrolls, fading only the edges that hide controls, in HTML", async () => {
    const path = await bundle("html-toolbar-row", `import "@looma-test/runtime";`);
    const page = await open(path, `<div id="frame" style="width: 320px"><ui-editor-toolbar id="toolbar">${buttons}</ui-editor-toolbar></div>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#toolbar:is([component~="ui-editor-toolbar"], [data-component~="ui-editor-toolbar"], .ui-editor-toolbar, [ui-editor-toolbar])');
    await checkRow(page);
    await page.close();
  });

  it("keeps one row that scrolls, fading only the edges that hide controls, in converted output", async () => {
    const path = await bundle("converted-toolbar-row", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiEditorToolbar as EditorToolbar } from "@looma-test/components";
      createScene({ render: () => sceneNode("div", { id: "frame", style: "width: 320px" }, [
        sceneNode(EditorToolbar, { id: "toolbar" }, () => Array.from({ length: 18 }, (_, index) => sceneNode("button", { type: "button" }, "B" + index))),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await checkRow(page);
    await page.close();
  });
});
