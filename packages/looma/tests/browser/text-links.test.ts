import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Text links", () => {
  it("underlines a link in running text", async () => {
    const path = await bundle("html-text-link", `import "@looma-test/runtime";`);
    const page = await open(path, `<ui-text id="line">Already have a site? <a id="link" href="#sign-in">Sign in</a>.</ui-text>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#line:is([component~="ui-text"], [data-component~="ui-text"], .ui-text, [ui-text])');
    assert.match(await page.locator("#link").evaluate((element) => getComputedStyle(element).textDecorationLine), /underline/);
    await page.close();
  });
});
