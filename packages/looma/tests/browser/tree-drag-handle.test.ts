import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Tree drag handle", () => {
  async function checkHandles(page: Page) {
    await page.waitForSelector('#leaf:is([component~="ui-tree-item"], [data-component~="ui-tree-item"], .ui-tree-item, [ui-tree-item])');
    await page.locator("#leaf-icon").hover();
    const leaf = await page.evaluate(() => {
      const item = document.querySelector("#leaf")!;
      const handle = item.querySelector(".drag-handle") as HTMLElement;
      const icon = document.querySelector("#leaf-icon")!.getBoundingClientRect();
      return { gap: icon.left - handle.getBoundingClientRect().right, background: getComputedStyle(handle).backgroundColor };
    });
    // A nested leaf's handle sits right before its icon, not a column and an indent away.
    assert.ok(leaf.gap >= 0 && leaf.gap <= 8, `handle-to-icon gap ${leaf.gap}px`);
    // Bare at rest: no faint surface behind the grip.
    assert.equal(leaf.background, "rgba(0, 0, 0, 0)");

    await page.locator("#branch-icon").hover();
    const branch = await page.evaluate(() => {
      const item = document.querySelector("#branch")!;
      const handle = item.querySelector(":scope > .row > .drag-handle, .row > .drag-handle") as HTMLElement;
      const disclosure = item.querySelector(".disclosure") as HTMLElement;
      return { handleRight: handle.getBoundingClientRect().right, disclosureLeft: disclosure.getBoundingClientRect().left };
    });
    // A branch keeps its disclosure; its handle sits just outside it rather than on top of it.
    assert.ok(branch.handleRight <= branch.disclosureLeft + 1, `branch handle ends at ${branch.handleRight}, disclosure starts at ${branch.disclosureLeft}`);
    assert.ok(branch.disclosureLeft - branch.handleRight <= 6, "and close to it");
  }

  it("sits beside what it drags and is bare at rest, in HTML", async () => {
    const path = await bundle("html-tree-drag-handle", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-tree label="Pages" style="width: 20rem; margin-inline-start: 3rem">
        <ui-tree-item id="branch" item-id="branch" label="Folder" sortable expanded>
          <span slot="leading" id="branch-icon">F</span>
          <ui-tree-item id="leaf" item-id="leaf" label="Page" sortable>
            <span slot="leading" id="leaf-icon">P</span>
          </ui-tree-item>
        </ui-tree-item>
      </ui-tree>`, [join(root, "tokens.css")]);
    await checkHandles(page);
    await page.close();
  });

  it("sits beside what it drags and is bare at rest, in converted output", async () => {
    const path = await bundle("converted-tree-drag-handle", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiTree as Tree, UiTreeItem as TreeItem } from "@looma-test/components";
      createScene({ render: () => sceneNode(Tree, { label: "Pages", style: "width: 20rem; margin-inline-start: 3rem" }, () => [
        sceneNode(TreeItem, { id: "branch", itemId: "branch", label: "Folder", sortable: true, expanded: true }, {
          leading: () => sceneNode("span", { id: "branch-icon" }, "F"),
          default: () => [sceneNode(TreeItem, { id: "leaf", itemId: "leaf", label: "Page", sortable: true }, { leading: () => sceneNode("span", { id: "leaf-icon" }, "P") })],
        }),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await checkHandles(page);
    await page.close();
  });
});
