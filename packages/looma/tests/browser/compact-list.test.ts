import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Compact list", () => {
  it("sets items close together, with no row padding", async () => {
    const path = await bundle("html-compact-list", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-list id="rows" aria-label="Rows"><ui-list-item id="row">One</ui-list-item></ui-list>
      <ui-list id="facts" density="compact" aria-label="Facts"><ui-list-item id="fact">One</ui-list-item></ui-list>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#fact:is([component~="ui-list-item"], [data-component~="ui-list-item"], .ui-list-item, [ui-list-item])');
    const size = (id: string) => page.locator(id).evaluate((element) => ({ height: element.getBoundingClientRect().height, padding: getComputedStyle(element).paddingInlineStart }));
    const row = await size("#row");
    const fact = await size("#fact");
    assert.ok(fact.height < row.height, `compact ${fact.height} < ${row.height}`);
    assert.equal(fact.padding, "0px");
    await page.close();
  });
});
