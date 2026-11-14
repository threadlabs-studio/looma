import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Expressive Markdown editor integration", () => {
  it("keeps heading picture choices and edits their description through the image toolbar", async () => {
    const path = await bundle("expressmark-heading-picture", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { editorBrowserTarget } from "../../tests/editor-browser-target.ts";
      import { markdownToEditorDocument } from "@threadlabs/looma/editor/expressmark";
      editorBrowserTarget().then(LoomaEditor => {
        const content = markdownToEditorDocument('<h1><picture><source media="(prefers-color-scheme: dark)" srcset="https://images.test/dark.svg"><img src="https://images.test/light.svg" alt="Project logo" width="280"></picture></h1>\\n\\nDescription.\\n\\n<picture><source media="(prefers-color-scheme: dark)" srcset="https://images.test/dark-block.svg"><img src="https://images.test/light-block.svg" alt="Standalone picture" width="800"></picture>');
        window.saved = content;
        createScene({ render: () => sceneNode(LoomaEditor, { content, editable: true, imageDelivery: () => ({ resolveSource: image => image.src.replace('/light', '/delivered-light') }), onChange: event => window.saved = event.detail.content }) }).mount("#app");
      });
    `);
    const page = await open(path, '<div id="app"></div>', [join(root, "tokens.css")], { viewport: { width: 375, height: 812 } });
    await page.route("https://images.test/**", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="80"><rect width="280" height="80" fill="#6354ce"/><text x="24" y="50" fill="white" font-size="28">Project logo</text></svg>' }));
    const image = page.getByRole("img", { name: "Project logo", exact: true });
    const blockImage = page.getByRole("img", { name: "Standalone picture", exact: true });
    await image.waitFor();
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).currentSrc)).toBe("https://images.test/dark.svg");
    await expect.poll(() => blockImage.evaluate(element => (element as HTMLImageElement).currentSrc)).toBe("https://images.test/dark-block.svg");
    await page.emulateMedia({ colorScheme: "light" });
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).currentSrc)).toBe("https://images.test/delivered-light.svg");
    await expect.poll(() => blockImage.evaluate(element => (element as HTMLImageElement).currentSrc)).toBe("https://images.test/delivered-light-block.svg");
    assert.ok((await blockImage.boundingBox())!.width <= 375, "block picture fits the phone viewport");
    assert.equal(await page.locator("h1 picture").count(), 1);
    await image.click();
    await page.getByRole("toolbar", { name: "Image actions", exact: true }).waitFor({ state: "visible" });
    assert.equal(await page.getByRole("button", { name: "Center image", exact: true }).count(), 0);
    if (process.env.LOOMA_CAPTURE_ARTIFACTS) await page.screenshot({ path: join(root, "../../.context/inline-picture-phone.png") });
    await page.getByRole("button", { name: "Image description", exact: true }).click();
    const form = page.getByRole("form", { name: "Image description" });
    await form.getByLabel("Alt text").fill("Updated project logo");
    await form.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("img", { name: "Updated project logo", exact: true }).waitFor();
    const saved = await page.evaluate(() => (window as any).saved);
    assert.equal(saved.content[0].type, "heading");
    assert.equal(saved.content[0].content[0].type, "loomaInlineImage");
    assert.equal(saved.content[0].content[0].attrs.src, "https://images.test/light.svg");
    assert.equal(saved.content[0].content[0].attrs.sources[0].srcset, "https://images.test/dark.svg");
    assert.equal(saved.content.at(-1).type, "image");
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole("img", { name: "Updated project logo", exact: true }).click();
    await page.getByRole("toolbar", { name: "Image actions", exact: true }).waitFor({ state: "visible" });
    assert.equal(await page.getByRole("button", { name: "Center image", exact: true }).count(), 0);
    if (process.env.LOOMA_CAPTURE_ARTIFACTS) await page.screenshot({ path: join(root, "../../.context/inline-picture-desktop.png") });
    await page.close();
  });

  it("opens and edits a section imported from separate HTML disclosure fragments", async () => {
    const path = await bundle("expressmark-html-disclosure", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { editorBrowserTarget } from "../../tests/editor-browser-target.ts";
      import { markdownToEditorDocument, editorDocumentToMarkdown } from "@threadlabs/looma/editor/expressmark";
      editorBrowserTarget().then(LoomaEditor => {
        const content = markdownToEditorDocument('<details>\\n<summary>More</summary>\\n\\nEditable **body**.\\n\\n</details>');
        createScene({ render: () => sceneNode(LoomaEditor, { content, editable: true, onChange: event => window.markdown = editorDocumentToMarkdown(event.detail.content) }) }).mount("#app");
      });
    `);
    const page = await open(path, '<div id="app"></div>', [join(root, "tokens.css")], { viewport: { width: 375, height: 812 } });
    const trigger = page.getByRole("button", { name: "More", exact: true });
    await expect.poll(() => trigger.getAttribute("aria-expanded")).toBe("true");
    await trigger.click();
    await expect.poll(() => trigger.getAttribute("aria-expanded")).toBe("false");
    await trigger.click();
    await expect.poll(() => trigger.getAttribute("aria-expanded")).toBe("true");
    const body = page.getByText("Editable body.", { exact: true });
    await body.waitFor({ state: "visible" });
    assert.equal(await body.locator("strong").textContent(), "body");
    await body.click();
    await page.keyboard.press("End");
    await page.keyboard.type(" updated");
    await expect.poll(() => page.evaluate(() => (window as any).markdown)).toContain("updated");
    assert.ok((await page.evaluate(() => (window as any).markdown)).includes("details"));
    await page.close();
  });

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
