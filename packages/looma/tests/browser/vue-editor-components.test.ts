import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("converted editor components", () => {
  it("updates suggestion visibility when only open, anchor or query changes", async () => {
    const path = await bundle("suggestion-input-tracking", `
      import "@looma-test/runtime";
      import { componentRegistry } from "@nextwebwg/html-next/runtime";
      window.updateSuggestion = (values) => componentRegistry.update(document.querySelector("#suggestion"), values);
    `);
    for (const kind of ["slash", "mention"]) {
      const tag = `ui-editor-${kind}-menu`;
      const contents = kind === "slash"
        ? '<ui-editor-slash-menu-item value="heading">Heading</ui-editor-slash-menu-item><ui-editor-slash-menu-item value="paragraph">Paragraph</ui-editor-slash-menu-item>'
        : '<ui-editor-mention-menu-item value="ada">Ada</ui-editor-mention-menu-item>';
      const page = await open(path, `<${tag} id="suggestion">${contents}</${tag}>`, [join(root, "tokens.css")]);
      const menu = page.locator("#suggestion");
      await expect.poll(() => menu.isVisible()).toBe(false);
      await page.evaluate(() => (window as any).updateSuggestion({ open: true }));
      await expect.poll(() => menu.isVisible(), { message: "an open surface still needs an anchor" }).toBe(false);
      await page.evaluate(() => (window as any).updateSuggestion({ anchorRect: { left: 500, top: 40, right: 520, bottom: 60 } }));
      await menu.waitFor({ state: "visible" });
      const first = (await menu.boundingBox())!;
      await page.evaluate(() => (window as any).updateSuggestion({ anchorRect: { left: 200, top: 40, right: 220, bottom: 60 } }));
      await page.waitForFunction(left => document.querySelector("#suggestion")!.getBoundingClientRect().left < left - 100, first.x);
      if (kind === "slash") {
        await page.evaluate(() => (window as any).updateSuggestion({ query: "Heading" }));
        await page.waitForFunction(() => document.querySelectorAll('#suggestion [role="option"]:not([hidden])').length === 1);
      }
      await page.evaluate(() => (window as any).updateSuggestion({ open: false }));
      await menu.waitFor({ state: "hidden" });
      await page.evaluate(() => (window as any).updateSuggestion({ open: true }));
      await menu.waitFor({ state: "visible" });
      await page.close();
    }
  });

  it("filters authored Slash groups and reports the command value", async () => {
    const path = await bundle("html-authored-slash-menu", `
      import "@looma-test/runtime";
      window.events = [];
      document.querySelector("#slash").addEventListener("select", (event) => window.events.push(event.detail));
    `);
    const page = await open(path, `
      <ui-editor-slash-menu id="slash" open query="h1" aria-label="Document commands" anchor-rect='{"left":500,"top":40,"right":520,"bottom":60}'>
        <ui-editor-slash-menu-group label="Basic blocks">
          <ui-editor-slash-menu-item value="heading-1" icon="heading-1" keywords="h1 title" description="Large section heading">Heading 1</ui-editor-slash-menu-item>
          <ui-editor-slash-menu-item value="paragraph" icon="pilcrow">Paragraph</ui-editor-slash-menu-item>
        </ui-editor-slash-menu-group>
        <ui-editor-slash-menu-group label="Media">
          <ui-editor-slash-menu-item value="image" icon="image">Image</ui-editor-slash-menu-item>
        </ui-editor-slash-menu-group>
        <div slot="empty">No matching commands</div>
        <div slot="footer">Use arrows to choose</div>
      </ui-editor-slash-menu>
    `, [join(root, "tokens.css")]);
    const menu = page.locator("#slash");
    await expect.poll(() => menu.getAttribute("aria-label")).toBe("Document commands");
    await expect.poll(() => menu.getByRole("option").count()).toBe(1);
    await expect.poll(() => menu.getByRole("group", { name: "Basic blocks" }).count()).toBe(1);
    await expect.poll(() => menu.getByRole("group", { name: "Media" }).count()).toBe(0);
    await expect.poll(() => menu.locator(".footer").textContent()).toBe("Use arrows to choose");
    await menu.locator('[role="option"][data-value="heading-1"]').click();
    assert.deepEqual(await page.evaluate(() => (window as any).events), [{ index: 0, value: "heading-1" }]);
    await page.close();

    const empty = await open(path, `
      <ui-editor-slash-menu id="slash" open query="missing" anchor-rect='{"left":500,"top":40,"right":520,"bottom":60}'>
        <ui-editor-slash-menu-item value="paragraph">Paragraph</ui-editor-slash-menu-item>
        <div slot="empty">No matching commands</div>
      </ui-editor-slash-menu>
    `, [join(root, "tokens.css")]);
    await expect.poll(() => empty.locator("#slash .empty").isVisible()).toBe(true);
    await expect.poll(() => empty.locator("#slash [role='option']").isVisible()).toBe(false);
    await empty.close();
  });

  it("projects authored editor suggestion items through the converter", async () => {
    const path = await bundle("converted-authored-editor-menus", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiEditorSlashMenu as EditorSlashMenu, UiEditorSlashMenuGroup as EditorSlashMenuGroup, UiEditorSlashMenuItem as EditorSlashMenuItem, UiEditorMentionMenu as EditorMentionMenu, UiEditorMentionMenuItem as EditorMentionMenuItem } from "@looma-test/components";
      const anchorRect = { left: 500, top: 40, right: 520, bottom: 60 };
      createScene({ render: () => sceneNode("div", [
        sceneNode(EditorSlashMenu, { id: "slash", open: true, query: "heading", anchorRect }, {
          default: () => sceneNode(EditorSlashMenuGroup, { label: "Basic" }, () =>
            sceneNode(EditorSlashMenuItem, { value: "heading", keywords: "h1" }, () => "Heading")),
          empty: () => sceneNode("div", "No commands"),
        }),
        sceneNode(EditorMentionMenu, { id: "mention", open: true, anchorRect, label: "People" }, {
          default: () => sceneNode(EditorMentionMenuItem, { value: "ada", initials: "AL" }, () => "Ada"),
          header: () => sceneNode("div", "People in this document"),
        }),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await expect.poll(() => page.locator("#slash").getByRole("option", { name: "Heading" }).count()).toBe(1);
    await expect.poll(() => page.locator("#mention").getByRole("option", { name: "Ada" }).count()).toBe(1);
    await expect.poll(() => page.locator("#mention .header").textContent()).toBe("People in this document");
    await page.close();
  });

  it("renders authored Mention items and empty/header slots with stable value events", async () => {
    const path = await bundle("html-authored-mention-menu", `
      import "@looma-test/runtime";
      window.events = [];
      document.querySelector("#mention").addEventListener("select", (event) => window.events.push(event.detail));
    `);
    const page = await open(path, `
      <ui-editor-mention-menu id="mention" open label="People" aria-label="Project mentions" anchor-rect='{"left":500,"top":40,"right":520,"bottom":60}'>
        <div slot="header">People in this document</div>
        <ui-editor-mention-menu-item value="ada" detail="Design" initials="AL">Ada Lovelace</ui-editor-mention-menu-item>
        <ui-editor-mention-menu-item value="grace" detail="Engineering"><span slot="start">GH</span>Grace Hopper</ui-editor-mention-menu-item>
        <div slot="empty">No matching people</div>
      </ui-editor-mention-menu>
    `, [join(root, "tokens.css")]);
    const menu = page.locator("#mention");
    await expect.poll(() => menu.isVisible()).toBe(true);
    await expect.poll(() => menu.getAttribute("aria-label")).toBe("Project mentions");
    await expect.poll(() => menu.getByRole("option").count()).toBe(2);
    await expect.poll(() => menu.locator(".header").textContent()).toBe("People in this document");
    await expect.poll(() => menu.locator(".empty").isVisible()).toBe(false);
    await menu.locator('[role="option"][data-value="grace"]').click();
    assert.deepEqual(await page.evaluate(() => (window as any).events), [{ index: 1, value: "grace" }]);
    await menu.getByRole("option").evaluateAll((items) => items.forEach((item) => item.remove()));
    await page.waitForFunction(() => document.querySelector("#mention .empty")?.getClientRects().length);
    await expect.poll(() => menu.locator(".empty").textContent()).toBe("No matching people");
    await page.close();
  });

  it("render menus, toolbars, and grids from their templates", async () => {
    const path = await bundle("converted-editor", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiEditorSlashMenu as EditorSlashMenu, UiEditorTableToolbar as EditorTableToolbar, UiEditorInsertTableGrid as EditorInsertTableGrid } from "@looma-test/components";
      const events = [];
      window.events = events;
      createScene({
        render: () => sceneNode("div", [
          sceneNode(EditorSlashMenu, { id: "slash", open: true, query: "ta", anchorRect: { left: 800, top: 20, right: 820, bottom: 40 },
            items: [{ title: "Table", description: "Rows and columns", icon: "table" }, { title: "Text", description: "Paragraph", icon: "pilcrow" }],
            onSelect: (event) => events.push(["select", event.detail]) }),
          sceneNode(EditorTableToolbar, { id: "toolbar", open: true, cellAlignment: "center",
            actions: ["align-left", "align-center", "add-row-after", "background-yellow", "delete-table"],
            onAction: (event) => events.push(["action", event.detail]) }),
          sceneNode(EditorInsertTableGrid, { id: "grid", open: true, maxRows: 4, maxCols: 5,
            onInsert: (event) => events.push(["insert", event.detail]) }),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);

    const items = page.locator('#slash [role="option"]');
    await expect.poll(() => items.locator(".title").allTextContents()).toStrictEqual(["Table", "Text"]);
    await expect.poll(() => page.locator("#slash .header").isVisible()).toBe(false);
    assert.ok(await items.first().locator("svg rect, svg path").count() > 0, "icons render as SVG shapes");
    await expect.poll(() => items.first().getAttribute("aria-selected")).toBe("true");
    await items.nth(1).click();

    await page.locator("#grid").evaluate((element) => { (element as HTMLElement).style.display = "none"; });
    const toolbar = page.locator("#toolbar");
    await expect.poll(() => toolbar.locator('[data-action="align-center"]').getAttribute("aria-pressed")).toBe("true");
    await expect.poll(() => toolbar.locator(".menu").count()).toBe(0);
    await toolbar.locator('[data-action="toggle-overflow"]').click();
    await expect.poll(() => toolbar.locator(".menu").count()).toBe(1);
    await page.waitForFunction(() => document.querySelector("#toolbar .menu")?.matches(":popover-open"));
    await expect.poll(() => toolbar.locator('.menu [role="menuitem"]').allInnerTexts()).toStrictEqual(["Delete table"]);
    await toolbar.locator('[data-action="delete-table"]').click();
    await expect.poll(() => toolbar.locator(".menu").count()).toBe(0);

    const grid = page.locator("#grid");
    await grid.evaluate((element) => { (element as HTMLElement).style.display = ""; });
    await expect.poll(() => grid.locator(".cell").count()).toBe(20);
    await grid.locator('[data-row="2"][data-col="4"]').click();
    await expect.poll(() => grid.locator(".cell.selected").count()).toBe(8);

    assert.deepEqual(await page.evaluate(() => (window as unknown as { events: unknown[] }).events), [
      ["select", { index: 1, value: "Text" }],
      ["action", { action: "delete-table" }],
      ["insert", { rows: 2, cols: 4, withHeaderRow: false }],
    ]);
    await page.close();
  });

  it.each(["HTML", "Converted"])("matches equivalent cell backgrounds without selecting custom colors in %s", async (adapter) => {
    const actions = ["background-none", "background-gray", "background-yellow"];
    const path = await bundle(`cell-background-${adapter.toLowerCase()}`, adapter === "HTML" ? `
      import "@looma-test/runtime";
      import { componentRegistry } from "@nextwebwg/html-next/runtime";
      window.setBackground = value => {
        for (const id of ["context", "toolbar"]) componentRegistry.update(document.getElementById(id), { cellBackground: value });
      };
    ` : `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiEditorTableContextMenu as EditorTableContextMenu, UiEditorTableToolbar as EditorTableToolbar } from "@looma-test/components";
      const background = createState("");
      window.setBackground = value => { background.value = value; };
      createScene({ render: () => sceneNode("div", [
        sceneNode(EditorTableContextMenu, { id: "context", open: true, actions: ${JSON.stringify(actions)}, cellBackground: background.value }),
        sceneNode(EditorTableToolbar, { id: "toolbar", open: true, actions: ${JSON.stringify(actions)}, cellBackground: background.value }),
      ]) }).mount("#app");
    `);
    const body = adapter === "HTML" ? `<ui-editor-table-context-menu id="context" open actions='${JSON.stringify(actions)}'></ui-editor-table-context-menu>
      <ui-editor-table-toolbar id="toolbar" open actions='${JSON.stringify(actions)}'></ui-editor-table-toolbar>` : '<div id="app"></div>';
    const page = await open(path, body, [join(root, "tokens.css")]);
    // Keep the independent fixtures apart so neither menu covers the other.
    await page.locator("#context").evaluate(element => { (element as HTMLElement).style.left = "500px"; });
    await page.locator("#toolbar").getByRole("button", { name: "Table options" }).click();
    for (const [color, expected] of [["rgb(243, 244, 246)", "Gray"], [" #F3F4F6 ", "Gray"], ["rgba(243, 244, 246, 1)", "Gray"],
      ["rgba(243, 244, 246, 0.5)", null], ["#123456", null], ["not-a-color", null], ["", "Default"]] as const) {
      await page.evaluate(value => (window as unknown as { setBackground(value: string): void }).setBackground(value), color);
      for (const id of ["context", "toolbar"]) {
        const selected = page.locator(`#${id} [role="menuitemradio"][aria-checked="true"]`);
        await page.waitForFunction(({ id, expected }) => {
          const items = document.querySelectorAll(`#${id} [role="menuitemradio"][aria-checked="true"]`);
          return expected === null ? items.length === 0 : items.length === 1 && items[0]?.textContent?.trim() === expected;
        }, { id, expected });
        await expect.poll(() => selected.count(), { message: `${adapter} ${id} reflects ${color}` }).toBe(expected === null ? 0 : 1);
      }
    }
    await page.close();
  });

  it("inserts from one roving table-picker tab stop and offers 44px touch cells", async () => {
    const path = await bundle("html-table-picker-keyboard", `
      import "@looma-test/runtime";
      window.inserts = [];
      document.querySelector("#picker").addEventListener("insert", (event) => window.inserts.push(event.detail));
    `);
    const page = await open(path, `
      <button id="before">Before</button>
      <ui-editor-insert-table-grid id="picker" open max-rows="4" max-cols="5" header-row></ui-editor-insert-table-grid>
    `, [join(root, "tokens.css")]);
    await expect.poll(() => page.locator("#picker .cell[tabindex='0']").count()).toBe(1);
    await page.locator("#before").focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.locator("#picker [data-row='3'][data-col='3']").evaluate((element) => element === document.activeElement), true);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator("#picker [data-row='4'][data-col='4']").evaluate((element) => element === document.activeElement), true);
    await page.keyboard.press("Enter");
    assert.deepEqual(await page.evaluate(() => (window as any).inserts), [{ rows: 4, cols: 4, withHeaderRow: true }]);
    await page.keyboard.press("Tab");
    assert.equal(await page.locator("#picker .header input").evaluate((element) => element === document.activeElement), true);
    await page.close();

    const touch = await open(path, `<ui-editor-insert-table-grid id="picker" open></ui-editor-insert-table-grid>`, [join(root, "tokens.css")], { hasTouch: true, isMobile: true, viewport: { width: 375, height: 667 } });
    const dimensions = await touch.locator("#picker .cell").first().evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { width: box.width, height: box.height };
    });
    assert.ok(dimensions.width >= 44 && dimensions.height >= 44, JSON.stringify(dimensions));
    await touch.close();
  });
});
