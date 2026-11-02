import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";
import { componentRoot } from "../renderers/selectors";

describe("Search Shell keyboard results", () => {
  const check = async (page: Page) => {
    const search = page.getByRole("searchbox", { name: "Search" });
    const first = page.locator("#first");
    const last = page.locator("#last");
    await search.focus();
    await search.press("ArrowDown");
    assert.equal(await first.evaluate((element) => element === document.activeElement), true);
    await first.press("ArrowUp");
    assert.equal(await last.evaluate((element) => element === document.activeElement), true);
    await last.press("Home");
    assert.equal(await first.evaluate((element) => element === document.activeElement), true);
    await first.press("Escape");
    await page.waitForFunction(() => !document.querySelector("dialog")?.open);
    assert.equal(await page.locator("dialog").evaluate((element: HTMLDialogElement) => element.open), false);
  };

  it("moves among enabled rows and closes on Escape in HTML", async () => {
    const path = await bundle("html-search-shell-keyboard", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-search-shell open label="Search">
        <input slot="search" type="search" aria-label="Search">
        <div slot="body">
          <ui-search-result-row id="first"><span slot="title">First</span></ui-search-result-row>
          <ui-search-result-row id="skip" disabled><span slot="title">Skip</span></ui-search-result-row>
          <ui-search-result-row id="last"><span slot="title">Last</span></ui-search-result-row>
        </div>
      </ui-search-shell>
    `, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("renders and reaches result rows added to its body after it opens in HTML", async () => {
    const path = await bundle("html-search-shell-added-rows", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-search-shell open label="Search">
        <input slot="search" type="search" aria-label="Search">
        <div slot="body" id="results"></div>
      </ui-search-shell>
    `, [join(root, "tokens.css")]);
    await page.waitForSelector("dialog[open]");
    // An application adds its results once a query resolves, after the shell has rendered.
    await page.locator("#results").evaluate((results) => {
      results.innerHTML = '<ui-search-result-row id="first"><span slot="title">First</span></ui-search-result-row>'
        + '<ui-search-result-row id="skip" disabled><span slot="title">Skip</span></ui-search-result-row>'
        + '<ui-search-result-row id="last"><span slot="title">Last</span></ui-search-result-row>';
    });
    await page.waitForSelector(`#results > button#last${componentRoot("ui-search-result-row")}`);
    assert.deepEqual((await page.locator("#results > button").allTextContents()).map((text) => text.trim()), ["First", "Skip", "Last"]);
    await check(page);
    await page.close();
  });

  it("moves among enabled rows and closes on Escape in converted output", async () => {
    const path = await bundle("converted-search-shell-keyboard", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiSearchShell as SearchShell, UiSearchResultRow as SearchResultRow } from "@looma-test/components";
      const row = (id, title, disabled = false) => sceneNode(SearchResultRow, { id, disabled }, { title: () => title });
      createScene({ render: () => sceneNode(SearchShell, { open: true, label: "Search" }, {
        search: () => sceneNode("input", { type: "search", "aria-label": "Search" }),
        body: () => sceneNode("div", [row("first", "First"), row("skip", "Skip", true), row("last", "Last")]),
      }) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });
});
