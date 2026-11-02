import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Cluster wrap", () => {
  // Two 40px items in a 60px cluster: the default wraps them onto two rows, nowrap keeps one row.
  const item = (id: string) => `<span id="${id}" style="display: inline-block; inline-size: 40px; flex: none">x</span>`;
  const fixture = `
    <div style="inline-size: 60px">
      <ui-cluster id="wraps">${item("wraps-a")}${item("wraps-b")}</ui-cluster>
      <ui-cluster id="nowrap" wrap="nowrap">${item("nowrap-a")}${item("nowrap-b")}</ui-cluster>
    </div>`;

  async function checkWrap(page: Page) {
    await page.waitForSelector('#nowrap:is([component~="ui-cluster"], [data-component~="ui-cluster"], .ui-cluster, [ui-cluster])');
    const top = (id: string) => page.locator(`#${id}`).evaluate((element) => Math.round(element.getBoundingClientRect().top));
    assert.equal(await page.locator("#wraps").evaluate((element) => getComputedStyle(element).flexWrap), "wrap");
    assert.equal(await page.locator("#nowrap").evaluate((element) => getComputedStyle(element).flexWrap), "nowrap");
    assert.notEqual(await top("wraps-a"), await top("wraps-b"), "the default wraps in a narrow container");
    assert.equal(await top("nowrap-a"), await top("nowrap-b"), "nowrap keeps its items on one row");
  }

  it("keeps a nowrap cluster on one row, in HTML", async () => {
    const path = await bundle("html-cluster-wrap", `import "@looma-test/runtime";`);
    const page = await open(path, fixture, [join(root, "tokens.css")]);
    await checkWrap(page);
    await page.close();
  });

  it("keeps a nowrap cluster on one row, in converted output", async () => {
    const path = await bundle("converted-cluster-wrap", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiCluster as Cluster } from "@looma-test/components";
      const item = (id) => sceneNode("span", { id, style: "display: inline-block; inline-size: 40px; flex: none" }, "x");
      createScene({ render: () => sceneNode("div", { style: "inline-size: 60px" }, [
        sceneNode(Cluster, { id: "wraps" }, () => [item("wraps-a"), item("wraps-b")]),
        sceneNode(Cluster, { id: "nowrap", wrap: "nowrap" }, () => [item("nowrap-a"), item("nowrap-b")]),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await checkWrap(page);
    await page.close();
  });
});
