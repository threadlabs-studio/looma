import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Editor toolbar tooltips", () => {
  it("labels its buttons with a Looma tooltip, not the browser's title", async () => {
    const path = await bundle("converted-toolbar-tip", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { editorBrowserTarget } from "../../tests/editor-browser-target.ts";
      import { Extension, generateJSON } from "@tiptap/core";
      import { getDefaultEditorExtensions } from "@threadlabs/looma/editor/extensions";
      editorBrowserTarget().then(LoomaEditor => {
      const content = createState(generateJSON("<p>Hello</p>", getDefaultEditorExtensions()));
      createScene({ render: () => sceneNode(LoomaEditor, { content: content.value, toolbarMode: "sticky" }) }).mount("#app");
      });
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const bold = page.locator(':is([component~="ui-editor-toolbar"], [data-component~="ui-editor-toolbar"], .ui-editor-toolbar, [ui-editor-toolbar]) button').first();
    await bold.waitFor();
    await expect.poll(() => bold.getAttribute("title"), { message: "no native title" }).toBe(null);
    // Checklist and Divider live in the slash menu, so the row fits at page width.
    const labels = await page.locator(':is([component~="ui-editor-toolbar"], [data-component~="ui-editor-toolbar"], .ui-editor-toolbar, [ui-editor-toolbar]) button')
      .evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label")));
    assert.ok(labels.includes("Bold") && labels.includes("Redo"), `toolbar labels: ${labels.join(", ")}`);
    assert.equal(labels.includes("Checklist") || labels.includes("Divider"), false);

    const tip = page.getByRole("tooltip");
    await bold.hover();
    await tip.waitFor({ state: "visible" });
    assert.match((await tip.textContent()) ?? "", /Bold/);
    // The command's own key binding follows the label, written for this platform.
    const apple = await page.evaluate(() => /Mac|iPhone|iPad|iPod/.test(navigator.platform));
    await expect.poll(() => tip.locator("kbd").textContent()).toBe(apple ? "⌘B" : "Ctrl+B");

    // In a secure context Client Hints name the platform "macOS", lowercase "mac", and still mean ⌘.
    await page.evaluate(() => {
      Object.defineProperty(navigator, "userAgentData", { configurable: true, value: { platform: "macOS" } });
      Object.defineProperty(navigator, "platform", { configurable: true, value: "" });
    });

    // Moving along the row re-points the same tooltip without waiting again.
    const italic = page.locator(':is([component~="ui-editor-toolbar"], [data-component~="ui-editor-toolbar"], .ui-editor-toolbar, [ui-editor-toolbar]) button').nth(1);
    await italic.hover();
    await expect.poll(() => tip.textContent()).toMatch(/Italic/);
    await expect.poll(() => tip.isVisible()).toBe(true);
    await expect.poll(() => tip.locator("kbd").textContent()).toBe("⌘I");
    await page.close();
  });
});
