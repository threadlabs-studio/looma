import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Pagination", () => {
  it("renders interactive native buttons from the standalone factory", async () => {
    const path = await bundle("pagination-standalone", `
      import { createUiPagination } from "@threadlabs/looma/vanilla/UiPagination.js";
      import { componentRegistry } from "@nextwebwg/html-next/runtime";
      const pager = createUiPagination({ page: 2, pages: [1, 2, 3].map(value => ({ value })), hasPrevious: true, hasNext: true });
      pager.addEventListener("navigate", event => componentRegistry.update(pager, { page: event.detail.page }));
      document.body.append(pager);
    `);
    const page = await open(path, "", [join(root, "tokens.css")]);
    try {
      const pager = page.getByRole("navigation", { name: "Results pages" });
      assert.equal(await pager.locator("button").count(), 5);
      assert.equal(await pager.locator("ui-button").count(), 0);
      const next = pager.getByRole("button", { name: "Next" });
      await next.press("Enter");
      await expect.poll(() => pager.getByRole("button", { name: "Page 3" }).getAttribute("aria-current")).toBe("page");
      assert.equal(await next.evaluate(element => element === document.activeElement), true);
    } finally { await page.close(); }
  });

  it("keeps native HTML page requests controlled and preserves keyboard focus at 375px", async () => {
    const path = await bundle("pagination-html", `import "@looma-test/runtime"; import { componentRegistry } from "@nextwebwg/html-next/runtime"; window.requests = []; document.addEventListener("navigate", event => { window.requests.push(event.detail); const page = event.detail.page; const pages = [...new Set([1, page - 1, page, page + 1, 10])].filter(value => value >= 1 && value <= 10).sort((a, b) => a - b).map(value => ({ value })); componentRegistry.update(event.target, { page, pages }); });`);
    const page = await open(path, `<main style="font-family:var(--ui-font-family-sans)"><ui-pagination id="pager" page="2" has-previous has-next pages='[{"value":1},{"value":2},{"value":3}]'></ui-pagination></main>`, [join(root, "tokens.css")], { viewport: { width: 375, height: 240 } });
    try {
      const next = page.getByRole("button", { name: "Next", exact: true });
      await next.click();
      await page.waitForFunction(() => document.querySelector('[aria-current="page"]')?.textContent?.trim() === "3");
      assert.equal(await next.evaluate(element => element === document.activeElement), true);
      const fourth = page.getByRole("button", { name: "Page 4", exact: true });
      const originalFourth = await fourth.elementHandle();
      await fourth.click();
      await page.waitForFunction(() => document.querySelector('[aria-current="page"]')?.textContent?.trim() === "4");
      assert.equal(await originalFourth!.evaluate(element => element === document.activeElement && element.getAttribute("aria-label") === "Page 4"), true);
      await page.getByRole("button", { name: "Page 1", exact: true }).press("Space");
      await page.waitForFunction(() => document.querySelector('[aria-current="page"]')?.textContent?.trim() === "1");
      await expect.poll(() => page.getByRole("button", { name: "Previous", exact: true }).isDisabled()).toBe(true);
      assert.deepEqual(await page.evaluate(() => (window as any).requests), [{ page: 3, previousPage: 2, trigger: "pointer" }, { page: 4, previousPage: 3, trigger: "pointer" }, { page: 1, previousPage: 4, trigger: "keyboard" }]);
      if (process.env.LOOMA_CAPTURE_ARTIFACTS) await page.screenshot({ path: join(root, "../../.context/pagination-native-mobile.png") });
    } finally { await page.close(); }
  });
});
