import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Prop-driven reading surfaces", () => {
  it("keeps soft tones distinct in HTML and converted without recoloring child actions", async () => {
    for (const framework of ["html", "converted"]) {
      const path = await bundle(`soft-card-${framework}`, framework === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiCard as Card, UiButton as Button, UiStack as Stack } from "@looma-test/components";
        createScene({ render: () => sceneNode(Stack, {}, () => ["neutral", "accent", "info", "success", "warning"].map(tone => sceneNode(Card, { id: tone, variant: "subtle", tone }, () => sceneNode(Button, { tone: "neutral" }, () => "Inspect")))) }).mount("#app");
      `);
      const page = await open(path, framework === "html" ? ["neutral", "accent", "info", "success", "warning"].map(tone => `<ui-card id="${tone}" variant="subtle" tone="${tone}"><ui-button tone="neutral">Inspect</ui-button></ui-card>`).join("") : `<div id="app"></div>`, [join(root, "tokens.css")], { viewport: { width: 375, height: 812 } });
      const colors = await page.evaluate(() => ["neutral", "accent", "info", "success", "warning"].map(id => {
        const card = document.getElementById(id)!;
        const button = card.querySelector("button, ui-button")!;
        return { surface: getComputedStyle(card).backgroundColor, button: getComputedStyle(button).backgroundColor, border: getComputedStyle(card).borderTopColor };
      }));
      assert.equal(new Set(colors.map(color => color.surface)).size, 5);
      assert.equal(new Set(colors.map(color => color.button)).size, 1);
      assert.ok(colors.every(color => color.border === "rgba(0, 0, 0, 0)"));
      await page.close();
    }
  });
  it("bounds a scrolling stack and protects its footer in HTML and converted", async () => {
    for (const framework of ["html", "converted"]) {
      const path = await bundle(`bounded-stack-${framework}`, framework === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiStack as Stack, UiScrollArea as ScrollArea, UiCluster as Cluster, UiText as Text, UiButton as Button } from "@looma-test/components";
        createScene({ render: () => sceneNode(Stack, { id:"frame", height: 500 }, () => [
          sceneNode(Text, {}, () => "Files"),
          sceneNode(ScrollArea, { id:"scroll", fill:true }, () => sceneNode(Stack, {}, () => Array.from({length:40}, (_, i) => sceneNode(Text, {}, () => "Line " + i)))),
          sceneNode(Cluster, { id:"footer", fixed:true, padding:"m", paddingEnd:"xl" }, () => [sceneNode(Text, {grow:true, truncate:true}, () => "A long selected document path"), sceneNode(Button, {}, () => "Save")])
        ]) }).mount("#app");
      `);
      const page = await open(path, framework === "html" ? `<ui-stack id="frame" height="500"><ui-text>Files</ui-text><ui-scroll-area id="scroll" fill><ui-stack>${Array.from({length:40}, (_, i) => `<ui-text>Line ${i}</ui-text>`).join("")}</ui-stack></ui-scroll-area><ui-cluster id="footer" fixed padding="m" padding-end="xl"><ui-text grow truncate>A long selected document path</ui-text><ui-button>Save</ui-button></ui-cluster></ui-stack>` : `<div id="app"></div>`, [join(root,"tokens.css")], {viewport:{width:375,height:812}});
      const state = await page.evaluate(() => {
        const frame=document.getElementById("frame")!, scroll=document.getElementById("scroll")!, footer=document.getElementById("footer")!;
        return {height:frame.getBoundingClientRect().height, scrollable:scroll.scrollHeight > scroll.clientHeight, footer:footer.getBoundingClientRect().bottom <= frame.getBoundingClientRect().bottom, clearance:parseFloat(getComputedStyle(footer).paddingInlineEnd), grow:getComputedStyle(footer.querySelector("p, ui-text")!).flexGrow};
      });
      assert.equal(state.height,500);
      assert.equal(state.scrollable,true);
      assert.equal(state.footer,true);
      assert.equal(state.clearance,64);
      assert.equal(state.grow,"1");
      await page.close();
    }
  });

  it("caps a growing textarea through maxRows in HTML and converted", async () => {
    for (const framework of ["html", "converted"]) {
      const path = await bundle(`bounded-field-${framework}`, framework === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiTextarea as Textarea } from "@looma-test/components";
        createScene({ render: () => sceneNode(Textarea, {rows:3, maxRows:6, autosize:true}) }).mount("#app");
      `);
      const page = await open(path, framework === "html" ? `<ui-textarea rows="3" max-rows="6" autosize></ui-textarea>` : `<div id="app"></div>`, [join(root,"tokens.css")], {viewport:{width:375,height:812}});
      const field = page.locator("textarea");
      await field.fill(Array.from({length:40}, (_, i) => "Line " + i).join("\n"));
      const state = await field.evaluate(element => ({height:element.getBoundingClientRect().height, scrollable:element.scrollHeight > element.clientHeight, maximum:parseFloat(getComputedStyle(element).maxHeight)}));
      assert.ok(state.height <= state.maximum + 1);
      assert.ok(state.height > 60 && state.height < 250);
      assert.equal(state.scrollable,true);
      await page.close();
    }
  });

  it("scrolls the document when the pointer is over inline table drag controls", async () => {
    const path = await bundle("editor-table-scroll", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { editorBrowserTarget } from "../../tests/editor-browser-target.ts";
      import { Extension, generateJSON } from "@tiptap/core";
      import { getDefaultEditorExtensions } from "@threadlabs/looma/editor/extensions";
      editorBrowserTarget().then(LoomaEditor => {
      createScene({ render: () => sceneNode(LoomaEditor, {
        extensions: () => [Extension.create({ name: "fixtureConsumer", onCreate() { const editor = this.editor; window.editor = editor; } })],
        content: generateJSON('<p>Before table</p><table><tr><td>First</td><td>Second</td></tr><tr><td>A</td><td>B</td></tr></table><p>After table</p>', getDefaultEditorExtensions()),
      }) }).mount("#app");
      });
    `);
    const page = await open(path,
      '<div id="scroller" style="height:400px;overflow:auto;transform:translateY(0);padding:48px"><div style="height:80px"></div><div id="app" style="width:600px;min-height:1200px"></div></div>',
      [join(root, "tokens.css"), join(root, "theme-light.css")],
      { viewport: { width: 1280, height: 800 } });
    try {
      const cell = page.locator(".ProseMirror td").first();
      await cell.hover();
      const handle = page.getByRole("button", { name: "Column actions", exact: true });
      await handle.waitFor();
      await handle.hover();
      const before = await page.locator("#scroller").evaluate(element => element.scrollTop);
      await page.mouse.wheel(0, 80);
      await page.waitForFunction(previous => document.querySelector("#scroller")!.scrollTop > previous, before, { timeout: 1500 });
      const shell = page.locator(".looma-editor__table-overlay-shell");
      assert.equal(await shell.evaluate(element => element.matches(":popover-open")), false, "inline controls belong to the document");
      assert.equal(await shell.evaluate(element => getComputedStyle(element).position), "absolute");
      const tableBox = (await page.locator(".ProseMirror table").boundingBox())!;
      const shellBox = (await shell.boundingBox())!;
      assert.ok(Math.abs(shellBox.x - tableBox.x) < 1 && Math.abs(shellBox.y - tableBox.y) < 1, "controls follow the table after nested scrolling");
      await cell.hover();
      await page.getByRole("button", { name: "Column actions", exact: true }).click();
      const menu = page.getByRole("menu", { name: "Column actions", exact: true });
      await menu.waitFor();
      await expect.poll(() => menu.evaluate(element => element.matches(":popover-open")), { message: "menus retain the top layer" }).toBe(true);
    } finally {
      await page.close();
    }
  });

  it("delays the column resize hint using the global tooltip delay", async () => {
    const path = await bundle("editor-resize-hint-delay", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { editorBrowserTarget } from "../../tests/editor-browser-target.ts";
      import { Extension, generateJSON } from "@tiptap/core";
      import { getDefaultEditorExtensions } from "@threadlabs/looma/editor/extensions";
      editorBrowserTarget().then(LoomaEditor => {
      createScene({ render: () => sceneNode(LoomaEditor, { content: generateJSON('<table><tr><td>First</td><td>Second</td></tr></table>', getDefaultEditorExtensions()) }) }).mount("#app");
      });
    `);
    const page = await open(path, '<div id="app" style="width:600px;margin:100px;--ui-tooltip-show-delay:1200ms"></div>',
      [join(root, "tokens.css"), join(root, "theme-light.css")], { viewport: { width: 1280, height: 800 } });
    try {
      const cell = page.locator(".ProseMirror td").first();
      const box = (await cell.boundingBox())!;
      await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2);
      await page.locator(".column-resize-handle").waitFor();
      const hint = page.getByRole("tooltip").filter({ hasText: "Drag to resize column" });
      await page.waitForTimeout(650);
      await expect.poll(() => hint.isVisible(), { message: "resize hints must respect the configured hover delay" }).toBe(false);
      await hint.waitFor({ state: "visible", timeout: 2000 });
      await page.mouse.move(900, 700);
      await hint.waitFor({ state: "hidden" });
      await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2);
      await page.mouse.move(900, 700);
      await page.waitForTimeout(1300);
      await expect.poll(() => hint.isVisible(), { message: "leaving cancels a pending hint" }).toBe(false);
    } finally { await page.close(); }
  });

  it("keeps one table toolbar below the table and sticks it to the bottom while scrolling", async () => {
    const path = await bundle("editor-sticky-table-toolbar", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { editorBrowserTarget } from "../../tests/editor-browser-target.ts";
      import { Extension, generateJSON } from "@tiptap/core";
      import { getDefaultEditorExtensions } from "@threadlabs/looma/editor/extensions";
      editorBrowserTarget().then(LoomaEditor => {
      createScene({ render: () => sceneNode(LoomaEditor, {
        content: generateJSON('<p>Before</p><table>' + Array.from({length:20}, (_, index) => '<tr><td>Row ' + index + '</td><td>Value</td></tr>').join('') + '</table><p>After</p>', getDefaultEditorExtensions()),
      }) }).mount("#app");
      });
    `);
    const page = await open(path, '<div id="scroller" style="height:420px;overflow:auto;padding:40px"><div id="app" style="width:900px"></div></div>',
      [join(root, "tokens.css"), join(root, "theme-light.css")], { viewport: { width: 1280, height: 800 } });
    try {
      await page.locator(".ProseMirror td").first().click();
      const toolbar = page.locator(".looma-editor__table-toolbar-shell");
      await toolbar.waitFor();
      await expect.poll(() => toolbar.count()).toBe(1);
      assert.equal(await toolbar.evaluate(element => getComputedStyle(element).position), "sticky");
      assert.equal(await toolbar.evaluate(element => element.matches(":popover-open")), false);
      assert.equal(await toolbar.evaluate(element => element.scrollWidth > element.clientWidth), false, "a roomy viewport must show the whole toolbar");
      const scroller = page.locator("#scroller");
      const viewport = (await scroller.boundingBox())!;
      const sticky = (await toolbar.boundingBox())!;
      assert.ok(sticky.y + sticky.height <= viewport.y + viewport.height && sticky.y > viewport.y, "toolbar sticks inside the bottom edge");
      if (process.env.LOOMA_SCREENSHOT_DIR) await page.screenshot({ path: join(process.env.LOOMA_SCREENSHOT_DIR, "table-toolbar-sticky.png") });
      await scroller.evaluate(element => { element.scrollTop = element.scrollHeight; });
      const table = page.locator(".ProseMirror table");
      await page.waitForTimeout(100);
      const below = (await toolbar.boundingBox())!;
      const tableBox = (await table.boundingBox())!;
      assert.ok(below.y >= tableBox.y + tableBox.height, "toolbar returns below the table when there is room");
      if (process.env.LOOMA_SCREENSHOT_DIR) await page.screenshot({ path: join(process.env.LOOMA_SCREENSHOT_DIR, "table-toolbar-below.png") });
      await page.getByRole("button", { name: "Table options", exact: true }).click();
      const menu = page.getByRole("menu", { name: "More table actions" });
      await menu.waitFor();
      assert.equal(await menu.evaluate(element => element.matches(":popover-open")), true);
    } finally { await page.close(); }
  });

  it("fits compact read-only editor excerpts while preserving the default canvas", async () => {
    const path = await bundle("compact-editor-surface", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { editorBrowserTarget } from "../../tests/editor-browser-target.ts";
      import { Extension, generateJSON } from "@tiptap/core";
      import { getDefaultEditorExtensions } from "@threadlabs/looma/editor/extensions";
      editorBrowserTarget().then(LoomaEditor => {
      const content = {type:"doc",content:[{type:"paragraph",content:[{type:"text",text:"Rich excerpt",marks:[{type:"bold"}]}]}]};
      createScene({render: () => sceneNode("div", {}, [sceneNode(LoomaEditor,{content:content,editable:false,label:"Default excerpt"}),sceneNode(LoomaEditor,{content:content,editable:false,contentDensity:"compact",label:"Compact excerpt"})])}).mount("#app");
      });
    `);
    for (const width of [375,1280]) {
      const page = await open(path, `<div id="app"></div>`, [join(root,"tokens.css")], {viewport:{width,height:812}});
      await page.getByRole("textbox", {name:"Compact excerpt",exact:true}).waitFor();
      const state = await page.evaluate(() => ["Default excerpt","Compact excerpt"].map(label => {
        const node=document.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;
        return {height:node.getBoundingClientRect().height,boundaryHeight:node.closest(".looma-editor")!.getBoundingClientRect().height,padding:getComputedStyle(node).padding,bold:node.querySelector("strong")?.textContent};
      }));
      assert.ok(state[0].height >= 300);
      assert.ok(state[1].height > 0 && state[1].height < 60);
      assert.ok(state[1].boundaryHeight < 60);
      assert.equal(state[1].padding,"0px");
      assert.equal(state[1].bold,state[0].bold);
      if (process.env.LOOMA_SCREENSHOT_DIR) await page.screenshot({path:join(process.env.LOOMA_SCREENSHOT_DIR, `editor-excerpts-${width}.png`)});
      await page.close();
    }
  });

});
