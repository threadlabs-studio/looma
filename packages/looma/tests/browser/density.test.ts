import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Density", () => {
  it("compacts menu rows and tab rows without rescaling a global token", async () => {
    const path = await bundle("converted-density", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiMenu as Menu, UiMenuItem as MenuItem, UiTabs as Tabs } from "@looma-test/components";
      const menu = (id, density) => sceneNode(Menu, { id, density, open: true }, () => [
        sceneNode(MenuItem, { id: id + "-item" }, () => "Rename"),
      ]);
      const tabs = (id, density) => sceneNode(Tabs, { id, density, label: "Views" }, () => [
        sceneNode("section", { "aria-label": "One" }, "First"),
      ]);
      createScene({ render: () => sceneNode("div", [menu("roomy"), menu("tight", "compact"), tabs("roomy-tabs"), tabs("tight-tabs", "compact")]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const box = (selector: string) => page.locator(selector).evaluate((element) => {
      const style = getComputedStyle(element);
      return { padding: style.paddingBlockStart, fontSize: style.fontSize, height: (element as HTMLElement).offsetHeight };
    });
    const roomyItem = await box("#roomy-item");
    const tightItem = await box("#tight-item");
    assert.ok(parseFloat(tightItem.padding) < parseFloat(roomyItem.padding), "compact menu rows are tighter");
    assert.ok(parseFloat(tightItem.fontSize) < parseFloat(roomyItem.fontSize), "compact menu rows use the smaller type");

    const roomyTab = await box('#roomy-tabs [role="tab"]');
    const tightTab = await box('#tight-tabs [role="tab"]');
    assert.ok(tightTab.height < roomyTab.height, "compact tabs are shorter");
    // The globals the component reads are untouched, so nothing nested inside is rescaled.
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--ui-space-2").trim()), "0.5rem");
    await page.close();
  });
});
