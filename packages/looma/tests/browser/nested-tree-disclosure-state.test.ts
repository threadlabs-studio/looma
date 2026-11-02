import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Nested Tree disclosure state", () => {
  async function checkDisclosureState(page: Page) {
    const parent = page.locator('#parent:is([component~="ui-tree-item"], [data-component~="ui-tree-item"], .ui-tree-item, [ui-tree-item])');
    const branch = page.locator('#branch:is([component~="ui-tree-item"], [data-component~="ui-tree-item"], .ui-tree-item, [ui-tree-item])');
    const leaf = page.locator('#leaf:is([component~="ui-tree-item"], [data-component~="ui-tree-item"], .ui-tree-item, [ui-tree-item])');
    await parent.waitFor({ state: "visible" });
    await expect.poll(() => parent.getAttribute("aria-expanded")).toBe("true");
    await expect.poll(() => branch.getAttribute("aria-expanded")).toBe("false");
    await expect.poll(() => leaf.isVisible()).toBe(false);
    const arrow = async (id: string) => page.locator(`#${id} > .row > .disclosure > .disclosure-icon`)
      .evaluate(element => getComputedStyle(element).transform);
    const expanded = await arrow("parent");
    const collapsed = await arrow("branch");
    assert.notEqual(collapsed, expanded, "an expanded ancestor must not rotate a collapsed descendant's disclosure");

    await branch.getByRole("button", { name: "Expand Branch", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("#branch")?.getAttribute("aria-expanded") === "true");
    await expect.poll(() => leaf.isVisible()).toBe(true);
    assert.equal(await arrow("branch"), expanded);
    await branch.getByRole("button", { name: "Collapse Branch", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("#branch")?.getAttribute("aria-expanded") === "false");
    await expect.poll(() => leaf.isVisible()).toBe(false);
    assert.equal(await arrow("branch"), collapsed);
    assert.equal(await arrow("parent"), expanded, "a descendant's collapse must leave its ancestor's disclosure expanded");
  }

  it("shows a collapsed descendant's own state under an expanded ancestor in HTML", async () => {
    const path = await bundle("html-nested-tree-disclosure", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-tree label="Files">
        <ui-tree-item id="parent" item-id="parent" label="Parent" container expanded>
          <ui-tree-item id="branch" item-id="branch" label="Branch" container>
            <ui-tree-item id="leaf" item-id="leaf" label="File"></ui-tree-item>
          </ui-tree-item>
        </ui-tree-item>
      </ui-tree>`, [join(root, "tokens.css")], { reducedMotion: "reduce" });
    await checkDisclosureState(page);
    await page.close();
  });

  it("shows a collapsed descendant's own state under an expanded ancestor in converted output", async () => {
    const path = await bundle("converted-nested-tree-disclosure", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiTree as Tree, UiTreeItem as TreeItem } from "@looma-test/components";
      createScene({ render: () => sceneNode(Tree, { label: "Files" }, () => [
        sceneNode(TreeItem, { id: "parent", itemId: "parent", label: "Parent", container: true, expanded: true }, () => [
          sceneNode(TreeItem, { id: "branch", itemId: "branch", label: "Branch", container: true }, () => [
            sceneNode(TreeItem, { id: "leaf", itemId: "leaf", label: "File" }),
          ]),
        ]),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")], { reducedMotion: "reduce" });
    await checkDisclosureState(page);
    await page.close();
  });
});
