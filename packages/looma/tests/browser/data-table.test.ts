import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { join } from "node:path";
import { type Page } from "playwright";
import { describe, it } from "vitest";
import { componentRoot } from "../renderers/selectors";
import { root, bundle, open } from "../renderers/browser-driver";

describe("Data Table", () => {
  const statusCell = '<span class="status" from:data-id="$row.id">{$row.done ? \'Done\' : \'Open\'}</span>';
  // A plain table whose last column renders a cell template, and a bounded table with wide columns,
  // a frozen column at each edge and a frozen leading row.
  const orders = [
    { id: 1, customer: "Ada Park", total: "$124.00", done: true },
    { id: 2, customer: "Ben Ortiz", total: "$18.50", done: false },
    { id: 3, customer: "Chen Wu", total: "$302.10", done: true },
  ];
  const reordered = [orders[2], orders[0], orders[1]];
  const regions = ["All regions", "North", "South", "East", "West", "Central", "Coastal", "Island", "Inland", "Valley"];
  const sales = regions.map((region, id) => ({ id, region, q1: 1000 + id, q2: 2000 + id, q3: 3000 + id, q4: 4000 + id, total: 10000 + id }));
  const quarters = ["q1", "q2", "q3", "q4"];
  // Attribute values are HTML Next expressions; JSON is one.
  const attribute = (value: unknown) => JSON.stringify(value).replaceAll('"', "&quot;");
  const markup = `
    <div style="width: 640px">
      <ui-data-table id="orders" caption="Orders" rows="${attribute(orders)}">
        <ui-column field="customer" header="Customer"></ui-column>
        <ui-column field="total" header="Total" align="end"></ui-column>
        <ui-column header="Status"><template slot="cell">${statusCell}</template></ui-column>
      </ui-data-table>
    </div>
    <div style="width: 360px">
      <ui-data-table id="sales" caption="Regional sales" frozen-rows="1" style="block-size: 12rem" rows="${attribute(sales)}">
        <ui-column field="region" header="Region" frozen="start" width="8rem"></ui-column>
        ${quarters.map((quarter) => `<ui-column field="${quarter}" header="${quarter.toUpperCase()}" align="end" width="10rem"></ui-column>`).join("")}
        <ui-column field="total" header="Total" align="end" frozen="end" width="6rem"></ui-column>
      </ui-data-table>
    </div>`;

  async function checkDataTable(page: Page, reorder?: () => Promise<void>) {
    const cells = (id: string) => page.locator(`#${id} tbody tr`).evaluateAll((rows) => rows.map((row) => Array.from((row as HTMLTableRowElement).cells, (cell) => cell.textContent!.trim())));

    // Each column is a header cell of the one table, captioned.
    await expect.poll(() => page.locator("#orders thead th").allTextContents()).toEqual(["Customer", "Total", "Status"]);
    await expect.poll(() => page.getByRole("table", { name: "Orders" }).count()).toBe(1);
    await expect.poll(() => page.locator('#orders thead th[scope="col"]').count()).toBe(3);

    // Field cells show the row's values, and the cell template renders once per row with its row.
    await expect.poll(() => cells("orders")).toEqual([["Ada Park", "$124.00", "Done"], ["Ben Ortiz", "$18.50", "Open"], ["Chen Wu", "$302.10", "Done"]]);
    await expect.poll(() => page.locator("#orders .status").evaluateAll((spans) => spans.map((span) => span.getAttribute("data-id")))).toEqual(["1", "2", "3"]);
    assert.equal(await page.locator("#orders tbody tr:first-child td:nth-child(2)").evaluate((cell) => getComputedStyle(cell).textAlign), "end");

    // Reordered rows keep their elements, found by rowKey. A native element's props come from its
    // markup, so only a consumer with state reorders them.
    if (reorder) {
      await page.locator("#orders tbody tr").evaluateAll((rows) => rows.forEach((row) => { (row as any).kept = row.textContent!.trim().split(/\s+/)[0]; }));
      await reorder();
      await expect.poll(() => cells("orders")).toEqual([["Chen Wu", "$302.10", "Done"], ["Ada Park", "$124.00", "Done"], ["Ben Ortiz", "$18.50", "Open"]]);
      assert.deepEqual(await page.locator("#orders tbody tr").evaluateAll((rows) => rows.map((row) => (row as any).kept)), ["Chen", "Ada", "Ben"]);
    }

    // A bounded table with wide columns scrolls in both directions inside its root.
    const sales = page.locator("#sales");
    await expect.poll(() => cells("sales").then((rows) => rows.length)).toBe(regions.length);
    await expect.poll(() => sales.evaluate((element) => element.scrollWidth > element.clientWidth && element.scrollHeight > element.clientHeight)).toBe(true);
    const geometry = () => sales.evaluate((element) => {
      const box = (selector: string) => {
        const { left, right, top, bottom } = element.querySelector(selector)!.getBoundingClientRect();
        return { left, right, top, bottom };
      };
      const view = element.getBoundingClientRect();
      return {
        view: { left: view.left + element.clientLeft, right: view.left + element.clientLeft + element.clientWidth, top: view.top + element.clientTop },
        startHead: box("thead th:first-child"), startCell: box("tbody tr:nth-child(6) td:first-child"),
        endHead: box("thead th:last-child"), endCell: box("tbody tr:nth-child(6) td:last-child"),
        head: box("thead th:nth-child(3)"), frozenRow: box("tbody tr:first-child td:first-child"),
        frozenRowCell: box("tbody tr:first-child td:nth-child(3)"), scrolling: box("tbody tr:nth-child(6) td:nth-child(3)"),
      };
    });
    // Frozen offsets are measured after layout; wait until the end column sits at the inline end.
    await expect.poll(async () => { const { endHead, view } = await geometry(); return Math.round(view.right - endHead.right); }).toBe(0);
    // Scroll past the caption first, so the header already sits at the top, then scroll both ways.
    const scroll = async (left: number, top: number) => {
      await sales.evaluate((element, [left, top]) => { element.scrollLeft = left; element.scrollTop = top; }, [left, top]);
      await expect.poll(() => sales.evaluate((element) => [element.scrollLeft, element.scrollTop])).toEqual([left, top]);
      return geometry();
    };
    const before = await scroll(0, 40);
    const after = await scroll(200, 160);
    const near = (actual: number, expected: number, message: string) => assert.ok(Math.abs(actual - expected) <= 1, `${message}: ${actual} is not ${expected}`);
    // The rows that scroll do move.
    near(after.scrolling.left, before.scrolling.left - 200, "scrolled cell, inline");
    near(after.scrolling.top, before.scrolling.top - 120, "scrolled cell, block");
    // Frozen-start columns stay at the inline start, and frozen-end columns at the inline end.
    for (const name of ["startHead", "startCell"] as const) {
      near(after[name].left, before[name].left, `${name} stays put`);
      near(after[name].left, after.view.left, `${name} at the inline start`);
    }
    for (const name of ["endHead", "endCell"] as const) {
      near(after[name].right, before[name].right, `${name} stays put`);
      near(after[name].right, after.view.right, `${name} at the inline end`);
    }
    // The header row stays at the top, and the frozen row beneath it.
    for (const name of ["head", "startHead", "endHead"] as const) near(after[name].top, after.view.top, `${name} at the top`);
    near(after.head.top, before.head.top, "header stays put");
    near(after.frozenRow.top, before.frozenRow.top, "frozen row stays put");
    near(after.frozenRow.top, after.head.bottom, "frozen row beneath the header");
    near(after.frozenRowCell.top, after.head.bottom, "a frozen row's scrolling cell stays beneath the header");
    near(after.frozenRow.left, after.view.left, "the frozen row's frozen column at the inline start");
  }

  it("renders columns, cells and frozen regions in HTML", async () => {
    // A page's own <template slot> with bindings needs HTML Next's live parser; a compiled consumer does not.
    const path = await bundle("html-data-table", `
      import { lowerDocument } from "@nextwebwg/html-next/live";
      import "@looma-test/runtime";
      lowerDocument();
    `);
    const page = await open(path, markup, [join(root, "tokens.css")]);
    await checkDataTable(page);
    await page.close();
  });

  it("renders columns, cells and frozen regions in converted output", async () => {
    const path = await bundle("converted-data-table", `
      import { createScene, createState, sceneNode, scopedSlot } from "@looma-test/scene";
      import { UiColumn as Column, UiDataTable as DataTable } from "@looma-test/components";
      const orders = createState(${JSON.stringify(orders)});
      window.reorder = () => { orders.value = ${JSON.stringify(reordered)}; };
      createScene({ render: () => [
        sceneNode("div", { style: "width: 640px" }, sceneNode(DataTable, { id: "orders", caption: "Orders", rows: orders.value }, () => [
          sceneNode(Column, { field: "customer", header: "Customer" }),
          sceneNode(Column, { field: "total", header: "Total", align: "end" }),
          sceneNode(Column, { header: "Status" }, { cell: scopedSlot(({ row }) => sceneNode("span", { class: "status", "data-id": row.id }, row.done ? "Done" : "Open"), ${JSON.stringify(statusCell)}) }),
        ])),
        sceneNode("div", { style: "width: 360px" }, sceneNode(DataTable, { id: "sales", caption: "Regional sales", frozenRows: 1, style: "block-size: 12rem", rows: ${JSON.stringify(sales)} }, () => [
          sceneNode(Column, { field: "region", header: "Region", frozen: "start", width: "8rem" }),
          ...${JSON.stringify(quarters)}.map((quarter) => sceneNode(Column, { field: quarter, header: quarter.toUpperCase(), align: "end", width: "10rem" })),
          sceneNode(Column, { field: "total", header: "Total", align: "end", frozen: "end", width: "6rem" }),
        ])),
      ] }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await checkDataTable(page, () => page.evaluate(() => (window as any).reorder()));
    await page.close();
  });

  it("renders the table, its column headers, header slots and field cells on the server", async () => {
    const { createHydratedScene, sceneNode, renderSceneToString } = await import("@looma-test/scene");
    const { UiColumn: Column, UiDataTable: DataTable } = await import("@looma-test/components");
    const html = await renderSceneToString(createHydratedScene({
      render: () => sceneNode(DataTable, { caption: "Orders", frozenRows: 1, rows: orders }, () => [
        sceneNode(Column, { field: "customer", header: "Customer", frozen: "start" }),
        sceneNode(Column, { field: "total" }, { header: () => sceneNode("abbr", { title: "Order total" }, "Total") }),
      ]),
    }));
    const wrapper = new JSDOM(html).window.document.querySelector(componentRoot("ui-data-table"))!;
    assert.equal(wrapper.localName, "div");
    assert.equal(wrapper.querySelector("table > caption")?.textContent, "Orders");
    assert.deepEqual(Array.from(wrapper.querySelectorAll("thead th"), (cell) => cell.textContent!.trim()), ["Customer", "Total"]);
    assert.equal(wrapper.querySelector("thead th abbr")?.getAttribute("title"), "Order total");
    assert.deepEqual(Array.from(wrapper.querySelectorAll("tbody tr"), (row) => Array.from(row.querySelectorAll("td"), (cell) => cell.textContent!.trim())), [["Ada Park", "$124.00"], ["Ben Ortiz", "$18.50"], ["Chen Wu", "$302.10"]]);
    assert.deepEqual(Array.from(wrapper.querySelectorAll("tbody tr"), (row) => row.classList.contains("frozen")), [true, false, false]);
  });

  it("hydrates server-rendered columns and keeps their cells", async () => {
    const { createHydratedScene, sceneNode, renderSceneToString } = await import("@looma-test/scene");
    const { UiColumn: Column, UiDataTable: DataTable } = await import("@looma-test/components");
    const scene = () => sceneNode(DataTable, { id: "orders", caption: "Orders", rows: orders }, () => [
      sceneNode(Column, { field: "customer", header: "Customer" }),
      sceneNode(Column, { field: "total" }, { header: () => sceneNode("abbr", { title: "Order total" }, "Total") }),
    ]);
    const html = await renderSceneToString(createHydratedScene({ render: scene }));
    const path = await bundle("hydrated-data-table", `
      import { createHydratedScene, sceneNode } from "@looma-test/scene";
      import { UiColumn as Column, UiDataTable as DataTable } from "@looma-test/components";
      const orders = ${JSON.stringify(orders)};
      createHydratedScene({ render: () => sceneNode(DataTable, { id: "orders", caption: "Orders", rows: orders }, () => [
        sceneNode(Column, { field: "customer", header: "Customer" }),
        sceneNode(Column, { field: "total" }, { header: () => sceneNode("abbr", { title: "Order total" }, "Total") }),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app">${html}</div>`, [join(root, "tokens.css")], {}, undefined, async (page) => {
      await page.locator("#app tbody tr").evaluateAll((rows) => rows.forEach((row, index) => { (row as any).server = index; }));
    });
    await expect.poll(() => page.locator("#orders thead th").allTextContents()).toEqual(["Customer", "Total"]);
    await expect.poll(() => page.locator("#orders tbody tr").evaluateAll((rows) => rows.map((row) => Array.from((row as HTMLTableRowElement).cells, (cell) => cell.textContent!.trim())))).toEqual([["Ada Park", "$124.00"], ["Ben Ortiz", "$18.50"], ["Chen Wu", "$302.10"]]);
    assert.deepEqual(await page.locator("#orders tbody tr").evaluateAll((rows) => rows.map((row) => (row as any).server)), [0, 1, 2], "hydration adopts the server rows");
    await page.close();
  });
});
