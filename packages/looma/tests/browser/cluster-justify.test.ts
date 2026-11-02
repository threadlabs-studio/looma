import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Cluster justify", () => {
  it("spreads a row's items to its ends with justify=between", async () => {
    const path = await bundle("html-cluster-justify", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-cluster id="between" justify="between" style="inline-size: 400px"><span id="first">Title</span><span id="last">Action</span></ui-cluster>
      <ui-cluster id="end" justify="end"><span>Action</span></ui-cluster>
      <ui-cluster id="plain"><span>Action</span></ui-cluster>
    `, [join(root, "tokens.css")]);
    await page.waitForSelector('#plain:is([component~="ui-cluster"], [data-component~="ui-cluster"], .ui-cluster, [ui-cluster])');
    const justify = (selector: string) => page.locator(selector).evaluate((element) => getComputedStyle(element).justifyContent);
    assert.equal(await justify("#between"), "space-between");
    assert.equal(await justify("#end"), "flex-end");
    assert.equal(await justify("#plain"), "normal");
    const edges = await page.evaluate(() => {
      const box = document.querySelector("#between")!.getBoundingClientRect();
      return { start: document.querySelector("#first")!.getBoundingClientRect().left - box.left, end: box.right - document.querySelector("#last")!.getBoundingClientRect().right };
    });
    assert.deepEqual(edges, { start: 0, end: 0 });
    await page.close();
  });
});
