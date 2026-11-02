import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Textarea autosize", () => {
  it("keeps rows as the minimum and grows and shrinks with input in HTML", async () => {
    const path = await bundle("html-textarea-autosize", `import "@looma-test/runtime";`);
    const page = await open(path, `<ui-textarea id="note" aria-label="Note" autosize rows="3"></ui-textarea>`, [join(root, "tokens.css")]);
    const textarea = page.locator("#note");
    const dimensions = () => textarea.evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
    }));
    const empty = await dimensions();
    assert.ok(empty.height >= empty.lineHeight * 3, "rows still establishes the minimum height");
    await textarea.fill(Array.from({ length: 12 }, (_, index) => `Line ${index + 1}`).join("\n"));
    const filled = await dimensions();
    assert.ok(filled.height > empty.height + empty.lineHeight * 6, "the control grows to reveal text");
    await textarea.fill("");
    assert.ok(Math.abs((await dimensions()).height - empty.height) < 2, "the control shrinks to its row minimum");
    await page.close();
  });

  it("passes autosize and rows through the converted projection", async () => {
    const path = await bundle("converted-textarea-autosize", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiTextarea as Textarea } from "@looma-test/components";
      createScene({ render: () => sceneNode(Textarea, { id: "note", "aria-label": "Note", autosize: true, rows: 2 }) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const textarea = page.locator("#note");
    const initial = await textarea.evaluate((element) => element.getBoundingClientRect().height);
    await textarea.fill("One\nTwo\nThree\nFour\nFive\nSix");
    assert.ok((await textarea.evaluate((element) => element.getBoundingClientRect().height)) > initial);
    await page.close();
  });
});
