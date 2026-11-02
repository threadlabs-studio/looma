import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Script focus targets", () => {
  it("draw no ring on a tabindex=-1 heading while controls and widgets keep theirs", async () => {
    const path = await bundle("html-focus-targets", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <h1 id="heading" tabindex="-1" style="width: 120px">A page title long enough to wrap</h1>
      <button id="button">Save</button>
      <button id="button-script" tabindex="-1">Close</button>
      <input id="input" aria-label="Name">
      <div id="option" role="option" tabindex="-1">Alpha</div>
    `, [join(root, "tokens.css")]);
    const ring = (selector: string) => page.locator(selector).evaluate((element: HTMLElement) => {
      element.focus();
      return { visible: element.matches(":focus-visible"), outline: getComputedStyle(element).outlineStyle };
    });
    await page.keyboard.press("Tab");
    assert.deepEqual(await ring("#heading"), { visible: true, outline: "none" });
    for (const selector of ["#button", "#button-script", "#input", "#option"]) {
      const { visible, outline } = await ring(selector);
      assert.equal(visible, true, selector);
      assert.notEqual(outline, "none", selector);
    }
    await page.close();
  });
});
