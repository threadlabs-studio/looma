import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open, scrollFades } from "../renderers/browser-driver";

describe("Scroll area", () => {
  it("trims only projected edge margins when requested in HTML and converted", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-scroll-area-trim`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiScrollArea as ScrollArea } from "@looma-test/components";
        createScene({ render: () => [false, true].map(trim => sceneNode(ScrollArea, { id: trim ? "trimmed" : "default", trim },
          () => [sceneNode("p", "First"), sceneNode("section", [sceneNode("p", "Nested")]), sceneNode("p", "Last")])) }).mount("#app");
      `);
      const content = '<p>First</p><section><p>Nested</p></section><p>Last</p>';
      const page = await open(path, adapter === "html" ? `<ui-scroll-area id="default">${content}</ui-scroll-area><ui-scroll-area id="trimmed" trim>${content}</ui-scroll-area>` : '<div id="app"></div>',
        [join(root, "tokens.css")]);
      await page.addStyleTag({ content: "p { margin-block: 20px }" });
      const margins = async (id: string) => page.locator(`#${id} p`).evaluateAll(elements => elements.map(element => {
        const style = getComputedStyle(element);
        return [parseFloat(style.marginTop), parseFloat(style.marginBottom)];
      }));
      assert.deepEqual(await margins("default"), [[20, 20], [20, 20], [20, 20]], "default scroll areas preserve authored margins");
      assert.deepEqual(await margins("trimmed"), [[0, 20], [20, 20], [20, 0]], "trim removes only the outside margins, preserving nested content");
      await page.close();
    }
  });

  const items = Array.from({ length: 30 }, (_, index) => `<p>Item ${index}</p>`).join("");
  const settle = (page: Page) => page.waitForTimeout(250);

  async function checkFades(page: Page) {
    const area = page.locator("#area");
    await area.waitFor();
    await settle(page);
    assert.equal(await area.evaluate((element) => getComputedStyle(element).overflowY), "auto");
    assert.deepEqual(await scrollFades(page, "#area"), { start: "0", end: "1" }, "only the end hides content at first");
    assert.notEqual(await area.evaluate((element) => getComputedStyle(element).maskImage), "none");

    await area.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await settle(page);
    assert.deepEqual(await scrollFades(page, "#area"), { start: "1", end: "0" }, "scrolled to the end, only the start hides content");

    await area.evaluate((element) => { element.scrollTop = (element.scrollHeight - element.clientHeight) / 2; });
    await settle(page);
    assert.deepEqual(await scrollFades(page, "#area"), { start: "1", end: "1" }, "in the middle, both edges hide content");

    await area.evaluate((element) => { (element as HTMLElement).style.height = "5000px"; });
    await settle(page);
    assert.deepEqual(await scrollFades(page, "#area"), { start: "0", end: "0" }, "content that fits shows no fade");
  }

  it("fades only the edges that hide content, in HTML", async () => {
    const path = await bundle("html-scroll-area", `import "@looma-test/runtime";`);
    const page = await open(path, `<ui-scroll-area id="area" style="height: 120px">${items}</ui-scroll-area>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#area:is([component~="ui-scroll-area"], [data-component~="ui-scroll-area"], .ui-scroll-area, [ui-scroll-area])');
    await checkFades(page);
    await page.close();
  });

  it("fades only the edges that hide content, in converted output", async () => {
    const path = await bundle("converted-scroll-area", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiScrollArea as ScrollArea } from "@looma-test/components";
      createScene({ render: () => sceneNode(ScrollArea, { id: "area", style: "height: 120px" },
        () => Array.from({ length: 30 }, (_, index) => sceneNode("p", "Item " + index))) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await checkFades(page);
    await page.close();
  });

  it("fades sideways, from the start edge, in a right-to-left horizontal area", async () => {
    const path = await bundle("html-scroll-area-rtl", `import "@looma-test/runtime";`);
    const page = await open(path, `<div dir="rtl"><ui-scroll-area id="area" orientation="horizontal" style="width: 200px"><p style="width: 2000px">Wide</p></ui-scroll-area></div>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#area:is([component~="ui-scroll-area"], [data-component~="ui-scroll-area"], .ui-scroll-area, [ui-scroll-area])');
    await settle(page);
    assert.deepEqual(await scrollFades(page, "#area"), { start: "0", end: "1" });
    assert.match(await page.locator("#area").evaluate((element) => getComputedStyle(element).maskImage), /^linear-gradient\(to left/);
    await page.close();
  });
});
