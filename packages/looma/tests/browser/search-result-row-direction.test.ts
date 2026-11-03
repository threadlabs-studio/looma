import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Search Result Row direction", () => {
  for (const adapter of ["HTML", "Converted"] as const) it(`aligns search result text at the reading start in ${adapter}`, async () => {
    const path = await bundle(`search-row-direction-${adapter}`, adapter === "HTML" ? 'import "@looma-test/runtime";' : `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiSearchResultRow as SearchResultRow } from "@looma-test/components";
      createScene({render:()=>sceneNode(SearchResultRow,{id:"result"},{title:()=>sceneNode("span",{id:"title"},"دليل البحث"),meta:()=>"Documentation"})}).mount("#app");
    `);
    const page = await open(path, adapter === "HTML"
      ? '<ui-search-result-row id="result"><span slot="title" id="title">دليل البحث</span><span slot="meta">Documentation</span></ui-search-result-row>'
      : '<div id="app"></div>', [join(root, "tokens.css")], {viewport:{width:375,height:700}});
    try {
      for (const dir of ["ltr", "rtl"]) {
        await page.locator("html").evaluate((element, value) => element.setAttribute("dir", value), dir);
        const alignment = await page.locator("#result .title").evaluate(element => {
          const range = document.createRange(); range.selectNodeContents(element);
          const text = range.getBoundingClientRect(), box = element.getBoundingClientRect();
          return {left:Math.abs(text.left-box.left), right:Math.abs(text.right-box.right)};
        });
        assert.ok((dir === "rtl" ? alignment.right : alignment.left) < 1, `${dir}: text starts at the reading edge`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      }
    } finally { await page.close(); }
  });
});
