import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Expressive Markdown editor integration", () => {
  it("bundles the safe converter in a browser and loads its JSON into LoomaEditor", async () => {
    const path = await bundle("expressmark-editor", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { editorBrowserTarget } from "../../tests/editor-browser-target.ts";
      import { Extension, generateJSON } from "@tiptap/core";
      import { getDefaultEditorExtensions } from "@threadlabs/looma/editor/extensions";
      import { editorDocumentToMarkdown, markdownToEditorDocument } from "@threadlabs/looma/editor/expressmark";
      editorBrowserTarget().then(LoomaEditor => {
      const content = markdownToEditorDocument('::: warning [Read first]\\nHello, @[Ada]#user-123 and :chip[Ready]{tone=green}.\\n:::\\n\\n<script>window.injection = true</script>');
      window.markdown = editorDocumentToMarkdown(content);
      createScene({ render: () => sceneNode(LoomaEditor, { content: content, editable: false }) }).mount("#app");
      });
    `);
    const page = await open(path, '<div id="app"></div>', [join(root, "tokens.css")], { viewport: { width: 375, height: 812 } });
    await page.getByText("Read first", { exact: true }).waitFor();
    await expect.poll(() => page.locator('[data-looma-chip]').getAttribute("data-label")).toBe("Ready");
    await expect.poll(() => page.locator('.looma-mention').count()).toBe(1);
    assert.equal(await page.evaluate(() => (window as any).injection), undefined);
    const markdown = await page.evaluate(() => (window as any).markdown);
    assert.ok(markdown.includes("user-123"));
    assert.ok(!markdown.includes("script"));
    await page.close();
  });
});
