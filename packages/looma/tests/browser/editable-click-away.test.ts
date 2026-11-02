import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Editable click away", () => {
  // Clicking another field saves the edit and leaves focus in the field that was clicked.
  const check = async (page: Page) => {
    await page.locator("#note .preview").click();
    await page.waitForFunction(() => document.activeElement?.matches("#note input"));
    await page.locator("#other").click();
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    assert.equal(await page.evaluate(() => document.activeElement?.id), "other");
  };

  it("keeps focus where the user clicked in HTML", async () => {
    const path = await bundle("html-editable-away", `import "@looma-test/runtime";`);
    const page = await open(path, `<ui-editable id="note" value="Inline"></ui-editable><input id="other" aria-label="Other">`, [join(root, "tokens.css")]);
    await page.locator('#note:is([component~="ui-editable"], [data-component~="ui-editable"], .ui-editable, [ui-editable])').waitFor();
    await check(page);
    await page.close();
  });

  it("keeps focus where the user clicked in converted output", async () => {
    const path = await bundle("converted-editable-away", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiEditable as Editable } from "@looma-test/components";
      createScene({ render: () => sceneNode("div", [sceneNode(Editable, { id: "note", value: "Inline" }), sceneNode("input", { id: "other", "aria-label": "Other" })]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });
});
