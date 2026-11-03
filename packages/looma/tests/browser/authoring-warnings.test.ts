import { loadFixture } from "../renderers/fixture";
import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { browser, bundle } from "../renderers/browser-driver";

describe("Authoring warnings", () => {
  // Each case is a field with one mistake; #good and #wrapped are authored correctly.
  const html = `
    <ui-form-field><label slot="label" for="good">Good</label><ui-input id="good"></ui-input></ui-form-field>
    <ui-form-field><label slot="label">Wrapped <input id="wrapped"></label></ui-form-field>
    <ui-form-field><label slot="label" id="linked-label">Linked</label><ui-input></ui-input></ui-form-field>
    <ui-form-field><label slot="label" for="twice">Twice</label><ui-input id="twice"></ui-input></ui-form-field>
    <span id="twice"></span>
    <input id="elsewhere" aria-label="Elsewhere">
    <ui-form-field><label slot="label" for="elsewhere">Stray</label><ui-input id="stray"></ui-input></ui-form-field>
    <ui-input-group id="group"><ui-input id="site" aria-label="Site"></ui-input><span slot="suffix">.example.com</span></ui-input-group>`;

  async function warnings(mode: string): Promise<string[]> {
    const path = await bundle(`html-authoring-${mode}`, `import "@looma-test/runtime";`, mode);
    const page = await browser.newPage();
    const messages: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "warning" && message.text().startsWith("ui-")) messages.push(message.text());
    });
    await page.setContent(`<!doctype html><html><body>${html}</body></html>`);
    await loadFixture(page, path);
    // Wait for both controllers to have linked their fields.
    await page.waitForFunction(() => document.querySelector("#linked-label")?.hasAttribute("for") && document.querySelector("#site")?.hasAttribute("aria-describedby"));
    // A copy of a linked group keeps its affix's id.
    await page.evaluate(() => {
      const copy = document.querySelector("#group")!.cloneNode(true) as Element;
      copy.id = "copy";
      copy.querySelector("input")!.id = "copy-site";
      document.body.append(copy);
    });
    await page.waitForTimeout(200);
    await page.close();
    return messages.map((message) => message.split(",")[0]).sort();
  }

  it("say what a field worked around, once each, in development", async () => {
    assert.deepEqual(await warnings("development"), [
      "ui-form-field: the input's id \"twice\" is used by another element in the same document or shadow root",
      "ui-form-field: the label has no for",
      "ui-form-field: the label's for=\"elsewhere\" does not point at this field's input",
      "ui-input-group: the affix id \"ui-input-group-affix-1\" is used by another element in the same document or shadow root",
    ]);
  });

  it("say nothing in a production build", async () => {
    assert.deepEqual(await warnings("production"), []);
  });
});
