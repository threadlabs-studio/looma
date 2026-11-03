import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Icon", () => {
  const shapes = (page: Page, selector: string) =>
    page.locator(`${selector} svg`).evaluate((svg) => [...svg.querySelectorAll("path, circle, rect, line")].map((shape) => shape.localName));

  // Only a binding or a framework adapter changes a rendered component's options, and a plain page has
  // neither, so "follows its name" is proven in converted output below.
  it("lowers from HTML already drawn", async () => {
    const path = await bundle("html-icon", `import "@looma-test/runtime";`);
    // Records each icon as it enters the document, before anything else has had a chance to run.
    const page = await open(path, `
      <script>
        window.firstSeen = {};
        new MutationObserver((records) => {
          for (const node of records.flatMap((record) => [...record.addedNodes])) {
            if (node.localName === "span" && node.id) firstSeen[node.id] = [...node.querySelectorAll("path, circle, rect, line")].map((shape) => shape.localName);
          }
        }).observe(document.body, { childList: true, subtree: true });
      </script>
      <ui-icon id="authored" name="italic"></ui-icon>
      <ui-icon id="unknown" name="not-an-icon"></ui-icon>
    `, [join(root, "tokens.css")]);
    await page.waitForSelector("span#authored");
    assert.deepEqual(await page.evaluate(() => (window as unknown as { firstSeen: unknown }).firstSeen), {
      authored: ["line", "line", "line"],
      unknown: [],
    });
    await expect.poll(() => page.locator("#authored").getAttribute("aria-hidden")).toBe("true");
    await page.close();
  });

  it("follows its name, in converted output", async () => {
    const path = await bundle("converted-icon", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiIcon as Icon } from "@looma-test/components";
      const name = createState("circle-x");
      window.iconName = name;
      createScene({ render: () => sceneNode(Icon, { id: "icon", name: name.value }) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    assert.deepEqual(await shapes(page, "#icon"), ["circle", "path", "path"]);
    await page.evaluate(() => { (window as unknown as { iconName: { value: string } }).iconName.value = "columns"; });
    await page.waitForFunction(() => document.querySelector("#icon rect") !== null);
    assert.deepEqual(await shapes(page, "#icon"), ["rect", "path", "path"]);
    await page.evaluate(() => { (window as unknown as { iconName: { value: string } }).iconName.value = ""; });
    await page.waitForFunction(() => document.querySelector("#icon svg")?.children.length === 0);
    await page.close();
  });
});
