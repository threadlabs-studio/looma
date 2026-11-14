import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Expressive Markdown editor integration", () => {
  it("edits line blocks without losing their structure or inline formatting", async () => {
    const path = await bundle("expressmark-line-block", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { editorBrowserTarget } from "../../tests/editor-browser-target.ts";
      import { markdownToEditorDocument, editorDocumentToMarkdown } from "@threadlabs/looma/editor/expressmark";
      editorBrowserTarget().then(LoomaEditor => {
        const content = markdownToEditorDocument('| First **line**\\n| Second line\\n\\nFollowing paragraph.');
        createScene({ render: () => sceneNode(LoomaEditor, { content, editable: true, onChange: event => window.markdown = editorDocumentToMarkdown(event.detail.content) }) }).mount("#app");
      });
    `);
    const page = await open(path, '<div id="app"></div>', [join(root, "tokens.css")], { viewport: { width: 375, height: 812 } });
    const block = page.locator('[contenteditable="true"] [data-type="line-block"]');
    await block.waitFor();
    assert.equal(await block.locator("strong").textContent(), "line");
    assert.equal(await block.locator("br").count(), 1);
    await block.click();
    await page.keyboard.press("End");
    await page.keyboard.type(" updated");
    await expect.poll(() => page.evaluate(() => (window as any).markdown)).toContain("updated");
    assert.ok((await page.evaluate(() => (window as any).markdown)).includes("| "));
    await page.close();
  });

  it("preserves styled code and nested task checkboxes from Markdown", async () => {
    const path = await bundle("expressmark-styled-code-tasks", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { editorBrowserTarget } from "../../tests/editor-browser-target.ts";
      import { markdownToEditorDocument } from "@threadlabs/looma/editor/expressmark";
      editorBrowserTarget().then(LoomaEditor => {
        const content = markdownToEditorDocument('Use **\u0060strong\u0060** and [\u0060linked\u0060](https://example.com/api).\\n\\n- [x] Parent task\\n  - [ ] Child task\\n\\n  Supporting paragraph.');
        createScene({ render: () => sceneNode(LoomaEditor, { content, editable: true }) }).mount("#app");
      });
    `);
    const page = await open(path, '<div id="app"></div>', [join(root, "tokens.css")], { viewport: { width: 375, height: 812 } });
    await page.locator("strong code").waitFor();
    assert.equal(await page.locator("strong code").textContent(), "strong");
    assert.equal(await page.locator("a code").textContent(), "linked");
    const parent = page.getByRole("checkbox", { name: /^Parent task/ });
    const child = page.getByRole("checkbox", { name: "Child task", exact: true });
    assert.equal(await parent.isChecked(), true);
    assert.equal(await child.isChecked(), false);
    await child.check();
    await expect.poll(() => child.isChecked()).toBe(true);
    assert.equal(await parent.isChecked(), true);
    await page.close();
  });

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
