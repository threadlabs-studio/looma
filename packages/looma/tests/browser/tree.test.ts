import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Tree", () => {
  it("lets a slotted label link fill the row through the label padding tokens", async () => {
    const path = await bundle("converted-tree-label", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiTree as Tree, UiTreeItem as TreeItem } from "@looma-test/components";
      const item = (id, style) => sceneNode(TreeItem, { id, itemId: id, label: "Welcome", style }, {
        label: () => sceneNode("a", { href: "#welcome", style: "display: flex; align-self: stretch; align-items: center" }, "Welcome"),
      });
      createScene({
        render: () => sceneNode(Tree, { label: "Pages" }, () => [
          item("flush", "--ui-tree-item-min-block-size: 44px; --ui-tree-item-label-padding-block: 0; --ui-tree-item-label-padding-inline: 0"),
          item("padded", "--ui-tree-item-min-block-size: 44px"),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const heights = (id: string) => page.locator(`#${id}`).evaluate((item) => ({
      row: (item.querySelector(".row") as HTMLElement).offsetHeight,
      link: (item.querySelector("a") as HTMLElement).offsetHeight,
    }));
    const flush = await heights("flush");
    assert.equal(flush.row, 44);
    assert.equal(flush.link, 44, "with zero label padding the link is the whole row");
    const padded = await heights("padded");
    assert.ok(padded.link < padded.row, "default label padding still insets the content");
    await page.close();
  });
});
