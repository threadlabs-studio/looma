import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Search Shell ignores a close from inside it", () => {
  it("stays open when a tooltip or menu inside it reports close", async () => {
    const path = await bundle("html-search-shell-inner-close", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-search-shell id="shell" open label="Search">
        <span slot="search"><input type="search" aria-label="Search"><button id="clear" type="button">x</button></span>
      </ui-search-shell>`, [join(root, "tokens.css")]);
    await page.waitForSelector("dialog[open]");
    await page.evaluate(() => { (window as any).closes = 0; document.querySelector("#shell")!.addEventListener("close", () => { (window as any).closes += 1; }); });
    // Components report their own "close" as a bubbling event, as a Tooltip does when its button goes away.
    await page.evaluate(() => document.querySelector("#clear")!.dispatchEvent(new CustomEvent("close", { bubbles: true, detail: { open: false } })));
    await page.waitForTimeout(200);
    assert.equal(await page.locator("dialog").evaluate((element: HTMLDialogElement) => element.open), true);
    assert.equal(await page.evaluate(() => (window as any).closes), 1, "only the inner event itself reached the shell");
    await page.close();
  });
});
