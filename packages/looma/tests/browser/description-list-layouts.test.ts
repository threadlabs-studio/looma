import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Description list layouts", () => {
  const hash = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";
  // A default list in a shrink-to-fit box and in a flex row keeps its content width.
  const lists = [
    { id: "rows", style: "width: 720px", props: {} },
    { id: "stacked", style: "width: 720px", props: { layout: "stacked" } },
    { id: "grid", style: "width: 720px", props: { layout: "grid", columns: "3" } },
    { id: "compact", style: "width: 720px", props: { density: "compact" } },
    { id: "floating", style: "position: absolute; inset-block-start: 0; inset-inline-end: 0; width: fit-content", props: {} },
    { id: "flex", style: "display: flex; width: 720px", props: {} },
  ];
  const terms = ["Order", "Status", "Total", "Checksum"];

  async function checkLists(page: Page) {
    await page.locator("#grid-4 dd").waitFor();
    const box = async (selector: string) => (await page.locator(selector).boundingBox())!;

    // Rows set the term beside its value; stacked sets it above.
    assert.ok(Math.abs((await box("#rows-1 dt")).y - (await box("#rows-1 dd")).y) <= 1, "rows: term beside value");
    const [term, value] = [await box("#stacked-1 dt"), await box("#stacked-1 dd")];
    assert.ok(value.y >= term.y + term.height - 1, "stacked: term above value");

    // Sized by its content, a default list neither collapses in a shrink-to-fit box nor stretches
    // across a flex row.
    for (const id of ["floating", "flex"]) {
      const [list, term, value] = [await box(`#${id}`), await box(`#${id}-1 dt`), await box(`#${id}-1 dd`)];
      assert.ok(Math.abs(term.y - value.y) <= 1, `${id}: term beside value`);
      assert.ok(value.x + value.width <= list.x + list.width + 1 && value.width > 0, `${id}: the value is inside the list`);
      assert.ok(list.width < 400, `${id}: the list is ${list.width}px, not stretched`);
    }

    // A grid of three columns: three facts per row, the fourth on the next.
    const tops = await Promise.all([1, 2, 3, 4].map(async (n) => Math.round((await box(`#grid-${n}`)).y)));
    assert.deepEqual(tops.slice(0, 3), [tops[0], tops[0], tops[0]]);
    assert.ok(tops[3] > tops[0], "the fourth fact starts a new row");

    // A long identifier wraps inside its value rather than overflowing.
    const [list, fact] = [await box("#grid"), await box("#grid-4")];
    assert.ok(fact.x + fact.width <= list.x + list.width + 1, "the fact stays within the list");
    assert.equal(await page.locator("#grid-4 dd").evaluate((element) => element.scrollWidth <= element.clientWidth), true);

    // Compact sets the pairs closer together.
    const gap = async (id: string) => (await box(`#${id}-2`)).y - ((await box(`#${id}-1`)).y + (await box(`#${id}-1`)).height);
    assert.ok(await gap("compact") < await gap("rows"), "compact pairs are closer");
  }

  it("lays out facts in rows, stacked, and in a grid, in HTML", async () => {
    const path = await bundle("html-description-list-layouts", `import "@looma-test/runtime";`);
    const attributes = (props: Record<string, unknown>) => Object.entries(props).map(([name, value]) => ` ${name}="${value}"`).join("");
    const page = await open(path, lists.map(({ id, style, props }) => `
      <div style="${style}"><ui-description-list id="${id}"${attributes(props)}>
        ${terms.map((term, index) => `<ui-description-item id="${id}-${index + 1}" term="${term}">${id === "grid" && index === 3 ? `<ui-text variant="code">${hash}</ui-text>` : "Value"}</ui-description-item>`).join("")}
      </ui-description-list></div>`).join(""), [join(root, "tokens.css")]);
    await checkLists(page);
    await page.close();
  });

  it("lays out facts in rows, stacked, and in a grid, in converted output", async () => {
    const path = await bundle("converted-description-list-layouts", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiDescriptionItem as DescriptionItem, UiDescriptionList as DescriptionList, UiText as Text } from "@looma-test/components";
      const lists = ${JSON.stringify(lists)};
      const terms = ${JSON.stringify(terms)};
      createScene({ render: () => lists.map(({ id, style, props }) => sceneNode("div", { style }, sceneNode(DescriptionList, { id, ...props }, () =>
        terms.map((term, index) => sceneNode(DescriptionItem, { id: \`\${id}-\${index + 1}\`, term }, () => id === "grid" && index === 3 ? sceneNode(Text, { variant: "code" }, () => "${hash}") : "Value"))))) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await checkLists(page);
    await page.close();
  });
});
