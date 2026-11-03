import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Tree Item label", () => {
  it("fills its cell, so a slotted link is the row's hit area", async () => {
    const path = await bundle("converted-tree-label-fill", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiTree as Tree, UiTreeItem as TreeItem } from "@looma-test/components";
      createScene({
        render: () => sceneNode("div", { style: "inline-size: 400px" }, [
          sceneNode(Tree, { label: "Pages" }, () => [
            sceneNode(TreeItem, { id: "page", itemId: "page", label: "Welcome" }, { label: () => sceneNode("a", { id: "link", href: "#welcome" }, "Welcome") }),
          ]),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const widths = await page.locator("#page").evaluate((item) => {
      const cell = item.querySelector(".label") as HTMLElement;
      const style = getComputedStyle(cell);
      return {
        cell: cell.clientWidth - parseFloat(style.paddingInlineStart) - parseFloat(style.paddingInlineEnd),
        link: (item.querySelector("#link") as HTMLElement).offsetWidth,
      };
    });
    assert.ok(widths.link > 100, `the link fills the cell rather than its text (${widths.link}px)`);
    assert.ok(Math.abs(widths.cell - widths.link) <= 2, `the link is the cell's width (${widths.link} of ${widths.cell})`);
    await page.close();
  });
});
