import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { componentRoot } from "../renderers/selectors";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Table", () => {
  // A comfortable and a compact table, each with a text row and a row of controls; a table too wide
  // for its box; and a bounded table whose header sticks.
  const figures = ["1,204,000", "1,388,000", "1,522,000", "1,610,000", "5,724,000", "4,443,000"];
  const markup = `
    <div id="fits-box" style="width: 640px">
      <ui-table id="fits">
        <table>
          <caption>Orders</caption>
          <thead><tr><th scope="col" id="fits-head">Name</th><th scope="col" data-ui-align="end">Seats</th></tr></thead>
          <tbody>
            <tr id="fits-text"><th scope="row">Ada</th><td data-ui-align="end" id="fits-figure">3</td></tr>
            <tr id="fits-control"><th scope="row"><ui-checkbox>Grace</ui-checkbox></th><td><ui-select aria-label="Role"><option>Editor</option></ui-select></td></tr>
          </tbody>
        </table>
      </ui-table>
    </div>
    <ui-table id="compact" density="compact">
      <table>
        <caption>Members</caption>
        <tbody>
          <tr id="compact-text"><th scope="row">Ada</th><td>Owner</td></tr>
          <tr id="compact-control"><th scope="row"><ui-checkbox>Grace</ui-checkbox></th><td><ui-button size="sm">Edit</ui-button></td></tr>
        </tbody>
      </table>
    </ui-table>
    <div id="wide-box" style="width: 200px">
      <ui-table id="wide">
        <table>
          <caption>Quarterly figures</caption>
          <tbody><tr>${figures.map((figure) => `<td>${figure}</td>`).join("")}</tr></tbody>
        </table>
      </ui-table>
    </div>
    <ui-table id="sticky" sticky-header style="block-size: 7rem">
      <table>
        <caption>Days</caption>
        <thead><tr><th scope="col" id="sticky-head">Day</th></tr></thead>
        <tbody>${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => `<tr><td>${day}</td></tr>`).join("")}</tbody>
      </table>
    </ui-table>`;

  async function checkTable(page: Page) {
    await page.locator("#sticky-head").waitFor();
    // A row's height inside its separator: the last row has none.
    const height = (selector: string) => page.locator(selector).evaluate((row) => (row as HTMLTableRowElement).cells[0].clientHeight);

    // The authored table stays a table, captioned, with its header scopes.
    await expect.poll(() => page.locator("#fits > table > caption").textContent()).toBe("Orders");
    await expect.poll(() => page.getByRole("table", { name: "Orders" }).count()).toBe(1);
    await expect.poll(() => page.locator('#fits th[scope="col"]').count()).toBe(2);
    assert.equal(await page.locator("#fits-figure").evaluate((element) => getComputedStyle(element).textAlign), "end");

    // A row of controls keeps the rhythm of a row of text, and compact rows are shorter.
    assert.equal(await height("#fits-control"), await height("#fits-text"));
    assert.equal(await height("#compact-control"), await height("#compact-text"));
    assert.ok(await height("#compact-text") < await height("#fits-text"), "compact rows are shorter");

    // A table that fits is not a region or a tab stop.
    await expect.poll(() => page.locator("#fits").getAttribute("role")).toBe(null);
    await expect.poll(() => page.locator("#fits").getAttribute("tabindex")).toBe(null);

    // A table wider than its box is a region named by its caption, which the keyboard scrolls.
    const region = page.getByRole("region", { name: "Quarterly figures" });
    await region.waitFor();
    await expect.poll(() => region.getAttribute("tabindex")).toBe("0");
    await region.focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(() => document.querySelector("#wide")!.scrollLeft > 0);

    // Given room, it is plain again; narrowed, the fitting table becomes a region.
    await page.locator("#wide-box").evaluate((element) => { element.style.width = "2000px"; });
    await page.waitForFunction(() => !document.querySelector("#wide")!.hasAttribute("role"));
    await expect.poll(() => page.locator("#wide").getAttribute("tabindex")).toBe(null);
    await page.locator("#fits-box").evaluate((element) => { element.style.width = "80px"; });
    await page.getByRole("region", { name: "Orders" }).waitFor();

    // A sticky header stays at the top of its table as the rows scroll, and a table that scrolls
    // only down is a region the keyboard can reach too.
    await page.getByRole("region", { name: "Days" }).waitFor();
    assert.equal(await page.locator("#fits-head").evaluate((element) => getComputedStyle(element).position), "static");
    await page.locator("#sticky").evaluate((element) => { element.scrollTop = 60; });
    const [head, box] = await Promise.all([page.locator("#sticky-head").boundingBox(), page.locator("#sticky").boundingBox()]);
    assert.ok(Math.abs(head!.y - box!.y) <= 1, `header ${head!.y} at the top ${box!.y}`);
  }

  it("styles an authored table, and makes a table too wide a named, scrollable region, in HTML", async () => {
    const path = await bundle("html-table", `import "@looma-test/runtime";`);
    const page = await open(path, markup, [join(root, "tokens.css")]);
    await checkTable(page);
    await page.close();
  });

  it("judges a moved table again, so a table re-inserted and then widened is plain", async () => {
    const path = await bundle("html-table", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <div id="moved-box" style="width: 200px">
        <ui-table id="moved"><table><caption>Moved</caption><tbody><tr>${figures.map((figure) => `<td>${figure}</td>`).join("")}</tr></tbody></table></ui-table>
      </div>`, [join(root, "tokens.css")]);
    await page.getByRole("region", { name: "Moved" }).waitFor();
    await page.evaluate(() => { (window as unknown as { moved: Element }).moved = document.querySelector("#moved")!; document.querySelector("#moved")!.remove(); });
    await page.waitForTimeout(50);
    await page.evaluate(() => { document.querySelector("#moved-box")!.append((window as unknown as { moved: Element }).moved); });
    await page.getByRole("region", { name: "Moved" }).waitFor();
    await page.locator("#moved-box").evaluate((element) => { element.style.width = "2000px"; });
    await page.waitForFunction(() => !document.querySelector("#moved")!.hasAttribute("role"));
    await expect.poll(() => page.locator("#moved").getAttribute("tabindex")).toBe(null);
    await expect.poll(() => page.locator("#moved").getAttribute("aria-labelledby")).toBe(null);
    await page.close();
  });

  it("styles an authored table, and makes a table too wide a named, scrollable region, in converted output", async () => {
    const path = await bundle("converted-table", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiButton as Button, UiCheckbox as Checkbox, UiSelect as Select, UiTable as Table } from "@looma-test/components";
      const figures = ${JSON.stringify(figures)};
      createScene({ render: () => [
        sceneNode("div", { id: "fits-box", style: "width: 640px" }, sceneNode(Table, { id: "fits" }, () => sceneNode("table", [
          sceneNode("caption", "Orders"),
          sceneNode("thead", sceneNode("tr", [sceneNode("th", { scope: "col", id: "fits-head" }, "Name"), sceneNode("th", { scope: "col", "data-ui-align": "end" }, "Seats")])),
          sceneNode("tbody", [
            sceneNode("tr", { id: "fits-text" }, [sceneNode("th", { scope: "row" }, "Ada"), sceneNode("td", { "data-ui-align": "end", id: "fits-figure" }, "3")]),
            sceneNode("tr", { id: "fits-control" }, [
              sceneNode("th", { scope: "row" }, sceneNode(Checkbox, null, () => "Grace")),
              sceneNode("td", sceneNode(Select, { "aria-label": "Role" }, () => sceneNode("option", "Editor"))),
            ]),
          ]),
        ]))),
        sceneNode(Table, { id: "compact", density: "compact" }, () => sceneNode("table", [
          sceneNode("caption", "Members"),
          sceneNode("tbody", [
            sceneNode("tr", { id: "compact-text" }, [sceneNode("th", { scope: "row" }, "Ada"), sceneNode("td", "Owner")]),
            sceneNode("tr", { id: "compact-control" }, [sceneNode("th", { scope: "row" }, sceneNode(Checkbox, null, () => "Grace")), sceneNode("td", sceneNode(Button, { size: "sm" }, () => "Edit"))]),
          ]),
        ])),
        sceneNode("div", { id: "wide-box", style: "width: 200px" }, sceneNode(Table, { id: "wide" }, () => sceneNode("table", [
          sceneNode("caption", "Quarterly figures"),
          sceneNode("tbody", sceneNode("tr", figures.map((figure) => sceneNode("td", figure)))),
        ]))),
        sceneNode(Table, { id: "sticky", stickyHeader: true, style: "block-size: 7rem" }, () => sceneNode("table", [
          sceneNode("caption", "Days"),
          sceneNode("thead", sceneNode("tr", sceneNode("th", { scope: "col", id: "sticky-head" }, "Day"))),
          sceneNode("tbody", ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => sceneNode("tr", sceneNode("td", day)))),
        ])),
      ] }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await checkTable(page);
    await page.close();
  });

  it("renders the authored table on the server, with no region until it scrolls", async () => {
    const { createHydratedScene, sceneNode } = await import("@looma-test/scene");
    const { renderSceneToString } = await import("@looma-test/scene");
    const { UiTable: Table } = await import("@looma-test/components");
    const html = await renderSceneToString(createHydratedScene({
      render: () => sceneNode(Table, { density: "compact", stickyHeader: true }, () => sceneNode("table", [sceneNode("caption", "Orders"), sceneNode("tbody", sceneNode("tr", sceneNode("td", "1")))])),
    }));
    const wrapper = new JSDOM(html).window.document.querySelector(componentRoot("ui-table"))!;
    assert.equal(wrapper.localName, "div");
    assert.equal(wrapper.getAttribute("data-ui-table-state"), "density density=compact stickyHeader");
    assert.equal(wrapper.querySelector("table > caption")?.textContent, "Orders");
    assert.equal(wrapper.querySelector("table > tbody td")?.textContent, "1");
    assert.equal(wrapper.hasAttribute("role"), false);
    assert.equal(wrapper.hasAttribute("tabindex"), false);
  });
});
