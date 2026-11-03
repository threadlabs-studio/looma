import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("LoomaEditor", () => {
  it("names its editing surface for assistive technology", async () => {
    const path = await bundle("converted-editor-label", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { editorBrowserTarget } from "../../tests/editor-browser-target.ts";
      import { Extension, generateJSON } from "@tiptap/core";
      import { getDefaultEditorExtensions } from "@threadlabs/looma/editor/extensions";
      editorBrowserTarget().then(LoomaEditor => {
      const label = createState("Page content");
      window.label = label;
      createScene({ render: () => sceneNode(LoomaEditor, { content: { type: "doc", content: [] }, label: label.value }) }).mount("#app");
      });
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const prose = page.locator(".ProseMirror");
    await prose.waitFor();
    await expect.poll(() => prose.getAttribute("aria-label")).toBe("Page content");
    await page.evaluate(() => { (window as unknown as { label: { value: string } }).label.value = "Meeting notes"; });
    await page.waitForFunction(() => document.querySelector(".ProseMirror")?.getAttribute("aria-label") === "Meeting notes");
    await page.close();
  });

  it("edits a document and opens the slash menu", async () => {
    const path = await bundle("converted-looma-editor", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { editorBrowserTarget } from "../../tests/editor-browser-target.ts";
      import { Extension, generateJSON } from "@tiptap/core";
      import { getDefaultEditorExtensions } from "@threadlabs/looma/editor/extensions";
      editorBrowserTarget().then(LoomaEditor => {
      const content = createState(generateJSON("<p>Hello</p>", getDefaultEditorExtensions()));
      window.content = content;
      createScene({
        render: () => sceneNode(LoomaEditor, { content: content.value, toolbarMode: "sticky", onChange: event => { content.value = event.detail.content; } }),
      }).mount("#app");
      });
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const prose = page.locator(".ProseMirror");
    await prose.waitFor();
    await expect.poll(() => prose.textContent()).toBe("Hello");
    assert.ok(await page.locator(':is([component~="ui-editor-toolbar"], [data-component~="ui-editor-toolbar"], .ui-editor-toolbar, [ui-editor-toolbar]) button').count() > 0, "formatting toolbar renders");
    await prose.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.type("/");
    const slash = page.locator(':is([component~="ui-editor-slash-menu"], [data-component~="ui-editor-slash-menu"], .ui-editor-slash-menu, [ui-editor-slash-menu])');
    await slash.locator('[role="option"]').first().waitFor();
    assert.ok(await slash.locator('[role="option"]').count() > 3, "slash menu lists blocks");
    const blank = await slash.locator('[role="option"]').evaluateAll((options) =>
      options.filter((option) => !option.querySelector(".icon svg > *")).map((option) => option.textContent?.trim()));
    assert.deepEqual(blank, [], "every block's icon draws");
    await page.close();
  });
});
