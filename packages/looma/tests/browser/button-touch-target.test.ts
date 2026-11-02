import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Button touch target", () => {
  it("takes a press within the control minimum under touch, link-style and xs included", async () => {
    const path = await bundle("html-button-touch", `import "@looma-test/runtime";`);
    const page = await open(path, `<div style="padding: 80px"><ui-button id="see-all" variant="link" size="sm">See all activity</ui-button><ui-button id="boxed" variant="outline" size="sm">Tag</ui-button><p style="margin-top: 80px">Looked after by <ui-button id="pill" variant="ghost" size="xs" shape="pill">Grace</ui-button></p></div>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#see-all:is([component~="ui-button"], [data-component~="ui-button"], .ui-button, [ui-button])');
    await page.evaluate(() => document.documentElement.setAttribute("data-ui-input-modality", "touch"));
    for (const id of ["#see-all", "#pill"]) {
      const reaches = await page.locator(id).evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const x = rect.x + rect.width / 2;
        const y = rect.y + rect.height / 2;
        const lands = (dy: number) => { const hit = document.elementFromPoint(x, y + dy); return Boolean(hit && (hit === element || element.contains(hit))); };
        return { height: rect.height, above: lands(-21), below: lands(21) };
      });
      assert.ok(reaches.height < 44, `${id} itself stays small`);
      assert.deepEqual({ above: reaches.above, below: reaches.below }, { above: true, below: true }, `${id} takes a press within the touch minimum`);
    }
    // A boxed button gets no hit area, so it cannot reach over a neighbour.
    assert.equal(await page.locator("#boxed").evaluate((element) => getComputedStyle(element, "::after").content), "none");
    await page.close();
  });
});
