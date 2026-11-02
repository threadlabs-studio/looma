import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Tree link rows", () => {
  for (const adapter of ["HTML", "Converted"] as const) it(`keeps branch hover continuous around the caret with an action cursor in ${adapter}`, async () => {
    const path = await bundle(`tree-hover-${adapter}`, adapter === "HTML" ? `import "@looma-test/runtime";` : `
      import {createScene,sceneNode} from "@looma-test/scene";
      import { UiTree as Tree, UiTreeItem as TreeItem } from "@looma-test/components";
      createScene({render:()=>sceneNode(Tree,{label:"Files"},()=>sceneNode(TreeItem,{id:"branch",label:"Project",container:true}))}).mount("#app");
    `);
    const page = await open(path, adapter === "HTML" ? '<ui-tree label="Files"><ui-tree-item id="branch" label="Project" container></ui-tree-item></ui-tree>' : '<div id="app"></div>', [join(root,"tokens.css")]);
    try {
      const row = page.locator("#branch > .row"), caret = row.locator(".disclosure");
      await row.locator(".label").hover();
      assert.equal(await row.locator(".label").evaluate(el=>getComputedStyle(el).cursor), "pointer", "expanding a branch is an action, not text editing");
      await caret.hover();
      assert.equal(await caret.evaluate(el=>getComputedStyle(el).backgroundColor), "rgba(0, 0, 0, 0)", "the caret does not erase the row highlight or its leading edge");
      await caret.click();
      await expect.poll(() => page.locator("#branch").getAttribute("aria-expanded")).toBe("true");
    } finally { await page.close(); }
  });

  const markup = `
    <ui-tree label="Pages">
      <ui-tree-item id="page" item-id="page" label="Welcome">
        <span slot="leading" id="page-icon">icon</span>
        <a slot="label" id="page-link" href="#welcome">Welcome</a>
        <span slot="actions"><button id="page-action" type="button">More</button><div role="menu"><div role="menuitem" id="page-menu-item" tabindex="-1">Move up</div></div></span>
      </ui-tree-item>
      <ui-tree-item id="plain" item-id="plain" label="Plain">
        <span slot="leading" id="plain-icon">icon</span>
      </ui-tree-item>
      <ui-tree-item id="folder" item-id="folder" label="Folder" container>
        <span slot="leading" id="folder-icon">icon</span>
        <div slot="actions" role="menu"><div role="menuitem" id="folder-menu-item" tabindex="-1">Rename</div></div>
      </ui-tree-item>
    </ui-tree>`;

  async function checkRows(page: Page) {
    await page.waitForSelector('#folder:is([component~="ui-tree-item"], [data-component~="ui-tree-item"], .ui-tree-item, [ui-tree-item])');
    await page.evaluate(() => {
      (window as unknown as { clicks: { meta: boolean }[] }).clicks = [];
      document.querySelector("#page-link")!.addEventListener("click", (event) => {
        (window as unknown as { clicks: { meta: boolean }[] }).clicks.push({ meta: (event as MouseEvent).metaKey });
      });
    });
    const clicks = () => page.evaluate(() => (window as unknown as { clicks: { meta: boolean }[] }).clicks);

    // The icon of a leaf row whose label is a link follows the link.
    await page.locator("#page-icon").click();
    await page.waitForFunction(() => location.hash === "#welcome");
    assert.deepEqual(await clicks(), [{ meta: false }]);
    // A modified click carries its modifiers to the link.
    await page.locator("#page-icon").click({ modifiers: ["Meta"] });
    assert.deepEqual((await clicks()).at(-1), { meta: true });

    // Controls keep their own behaviour.
    const before = (await clicks()).length;
    await page.locator("#page").hover();
    await page.locator("#page-action").click({ force: true });
    assert.equal((await clicks()).length, before, "a control does not follow the label link");
    // Nor does an item of a menu the row holds, such as its options.
    await page.locator("#page-menu-item").click({ force: true });
    assert.equal((await clicks()).length, before, "a menu item in the row does not follow the label link");

    // A leaf without a link does nothing; a branch still toggles.
    await page.locator("#plain-icon").click();
    const expanded = () => page.evaluate(() => {
      const folder = document.querySelector("#folder")!;
      const item = folder.matches('[role="treeitem"]') ? folder : folder.querySelector('[role="treeitem"]');
      return item?.getAttribute("aria-expanded");
    });
    assert.equal(await expanded(), "false");
    await page.locator("#folder-menu-item").click({ force: true });
    assert.equal(await expanded(), "false", "a menu item in a branch row does not toggle it");
    await page.locator("#folder-icon").click();
    await page.waitForFunction(() => {
      const folder = document.querySelector("#folder")!;
      const item = folder.matches('[role="treeitem"]') ? folder : folder.querySelector('[role="treeitem"]');
      return item?.getAttribute("aria-expanded") === "true";
    });
  }

  it("follows a leaf row's label link from the rest of the row, in HTML", async () => {
    const path = await bundle("html-tree-link-rows", `import "@looma-test/runtime";`);
    const page = await open(path, markup, [join(root, "tokens.css")]);
    await checkRows(page);
    await page.close();
  });

  it("follows a leaf row's label link from the rest of the row, in converted output", async () => {
    const path = await bundle("converted-tree-link-rows", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiTree as Tree, UiTreeItem as TreeItem } from "@looma-test/components";
      createScene({ render: () => sceneNode(Tree, { label: "Pages" }, () => [
        sceneNode(TreeItem, { id: "page", itemId: "page", label: "Welcome" }, {
          leading: () => sceneNode("span", { id: "page-icon" }, "icon"),
          label: () => sceneNode("a", { id: "page-link", href: "#welcome" }, "Welcome"),
          actions: () => sceneNode("span", [
            sceneNode("button", { id: "page-action", type: "button" }, "More"),
            sceneNode("div", { role: "menu" }, [sceneNode("div", { role: "menuitem", id: "page-menu-item", tabindex: -1 }, "Move up")]),
          ]),
        }),
        sceneNode(TreeItem, { id: "plain", itemId: "plain", label: "Plain" }, { leading: () => sceneNode("span", { id: "plain-icon" }, "icon") }),
        sceneNode(TreeItem, { id: "folder", itemId: "folder", label: "Folder", container: true }, {
          leading: () => sceneNode("span", { id: "folder-icon" }, "icon"),
          actions: () => sceneNode("div", { role: "menu" }, [sceneNode("div", { role: "menuitem", id: "folder-menu-item", tabindex: -1 }, "Rename")]),
        }),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await checkRows(page);
    await page.close();
  });
});
