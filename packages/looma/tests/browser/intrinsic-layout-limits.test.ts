import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Intrinsic layout limits", () => {
  it("caps Grid columns and stacks Switcher children above its count limit in HTML", async () => {
    const path = await bundle("html-layout-limits", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-grid id="grid" columns="3" min="sm" style="width: 1000px">
        <div>A</div><div>B</div><div>C</div><div>D</div><div>E</div>
      </ui-grid>
      <ui-switcher id="switcher" limit="3" style="width: 1000px">
        <div>A</div><div>B</div><div>C</div><div>D</div>
      </ui-switcher>
    `, [join(root, "tokens.css")]);
    const columns = () => page.locator("#grid").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
    assert.equal(await columns(), 3);
    await page.locator("#grid").evaluate((element) => { element.style.width = "400px"; });
    assert.ok((await columns()) < 3, "the cap still allows fewer columns in a narrow container");
    const rows = () => page.locator("#switcher").evaluate((element) => Array.from(element.children).map((child) => Math.round(child.getBoundingClientRect().top)));
    assert.equal(new Set(await rows()).size, 4);
    await page.locator("#switcher > div").last().evaluate((element) => element.remove());
    await page.waitForFunction(() => {
      const children = Array.from(document.querySelector("#switcher")!.children);
      return children.length === 3 && children.every((child) => child.getBoundingClientRect().top === children[0]!.getBoundingClientRect().top);
    });
    assert.equal(new Set(await rows()).size, 1);
    await page.close();
  });

  it("lays out slotted components in Switcher, Reel and Cover from their own boxes", async () => {
    const path = await bundle("converted-layout-slotted-components", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiSwitcher, UiCard, UiStack, UiReel, UiCover } from "@looma-test/components";
      const card = (text, props = {}) => sceneNode(UiCard, props, () => text);
      createScene({ render: () => sceneNode("main", [
        sceneNode(UiSwitcher, { id: "switcher", style: "width:1000px" }, () => [card("A"), sceneNode(UiStack, {}, () => sceneNode("span", "B")), card("C")]),
        sceneNode(UiSwitcher, { id: "limited", limit: 3, style: "width:1000px" }, () => [card("A"), card("B"), card("C"), card("D")]),
        sceneNode(UiReel, { id: "reel", itemWidth: "sm", "aria-label": "Items", style: "width:300px" }, () => [card("A"), card("B"), card("C")]),
        sceneNode("div", { style: "width:300px;block-size:20rem;display:flex;flex-direction:column" }, [
          sceneNode(UiCover, { id: "cover", size: "fill" }, () => [card("Sign in"), card("Wide", { style: "width:400px" })]),
        ]),
      ]) }).mount("#app");
    `);
    const page = await open(path, '<div id="app"></div>', [join(root, "tokens.css")]);
    await page.waitForSelector("#cover");
    const boxes = (selector: string) => page.locator(selector).evaluate((element) => Array.from(element.children, (child) => {
      const { left, top, width } = child.getBoundingClientRect();
      return { left: Math.round(left), top: Math.round(top), width: Math.round(width) };
    }));
    const row = await boxes("#switcher");
    assert.equal(new Set(row.map((box) => box.top)).size, 1, "a wide Switcher sets its components side by side");
    assert.equal(new Set(row.map((box) => box.width)).size, 1, "with equal widths");
    await page.locator("#switcher").evaluate((element) => { element.style.width = "300px"; });
    const stack = await boxes("#switcher");
    assert.equal(new Set(stack.map((box) => box.top)).size, 3, "a narrow Switcher stacks its components");
    assert.ok(stack.every((box) => box.width === 300), JSON.stringify(stack));
    assert.equal(new Set((await boxes("#limited")).map((box) => box.top)).size, 4, "components above the limit stack");
    const reel = await boxes("#reel");
    assert.ok(reel.every((box) => box.width === 192), JSON.stringify(reel));
    assert.ok(await page.locator("#reel").evaluate((element) => element.scrollWidth > element.clientWidth), "the reel scrolls once its items overflow");
    const cover = await page.locator("#cover").evaluate((element) => element.getBoundingClientRect().left);
    const [card, wide] = await boxes("#cover");
    assert.ok(Math.abs(card!.left - cover - (300 - card!.width) / 2) <= 1, "Cover centres a component");
    assert.ok(wide!.left >= cover, "a component wider than Cover keeps its start edge in view");
    await page.close();
  });

  it("passes Grid and Switcher limits through the converter", async () => {
    const path = await bundle("converted-layout-limits", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiGrid as Grid, UiSwitcher as Switcher } from "@looma-test/components";
      createScene({ render: () => sceneNode("main", [
        sceneNode(Grid, { id: "grid", columns: 2, style: { width: "1000px" } }, () => [sceneNode("div", "A"), sceneNode("div", "B"), sceneNode("div", "C")]),
        sceneNode(Switcher, { id: "switcher", limit: 2, style: { width: "1000px" } }, () => [sceneNode("div", "A"), sceneNode("div", "B"), sceneNode("div", "C")]),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    assert.equal(await page.locator("#grid").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length), 2);
    assert.equal(await page.locator("#switcher").evaluate((element) => new Set(Array.from(element.children, (child) => Math.round(child.getBoundingClientRect().top))).size), 3);
    await page.close();
  });
});
