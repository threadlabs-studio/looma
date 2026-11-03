import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Search Result Row selected", () => {
  // A row is a button in the shell's results, not an option in a listbox, so the current result is
  // stated with aria-current, which a button supports; aria-selected would be ignored on it.
  const check = async (page: Page) => {
    await page.locator("#other").waitFor();
    assert.equal(await page.locator("#current").evaluate((element) => element.localName), "button");
    await expect.poll(() => page.locator("#current").getAttribute("aria-current")).toBe("true");
    await expect.poll(() => page.locator("#other").getAttribute("aria-current")).not.toBe("true");
    await expect.poll(() => page.locator("#current").getAttribute("aria-selected")).toBe(null);
  };

  it("states the current result to assistive technology in HTML", async () => {
    const path = await bundle("html-search-row", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-search-result-row id="current" selected><span slot="title">Tokens</span></ui-search-result-row>
      <ui-search-result-row id="other"><span slot="title">Themes</span></ui-search-result-row>
    `, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("states the current result to assistive technology in converted output", async () => {
    const path = await bundle("converted-search-row", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiSearchResultRow as SearchResultRow } from "@looma-test/components";
      createScene({
        render: () => sceneNode("div", [
          sceneNode(SearchResultRow, { id: "current", selected: true }, { title: () => "Tokens" }),
          sceneNode(SearchResultRow, { id: "other" }, { title: () => "Themes" }),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });
});
