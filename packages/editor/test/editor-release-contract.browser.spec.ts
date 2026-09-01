import { userEvent } from "@vitest/browser/context";
import axe from "axe-core";
import { beforeEach, describe, expect, it } from "vitest";

import "../src/editor.css";
import "../src/index";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("editor release interactions (real browser)", () => {
  it("supports keyboard dimension selection and stable table insertion intent", async () => {
    document.body.innerHTML = '<ui-editor-insert-table-grid open max-rows="3" max-cols="3"></ui-editor-insert-table-grid>';
    const grid = document.querySelector("ui-editor-insert-table-grid")!;
    const details: unknown[] = [];
    grid.addEventListener("looma-editor-insert-table", (event) => {
      details.push((event as CustomEvent).detail);
    });
    const dimension = grid.querySelector<HTMLButtonElement>('[aria-label="3 rows by 2 columns"]')!;

    dimension.focus();
    await userEvent.keyboard("{Enter}");
    expect(grid.querySelector(".ui-editor-insert-table-grid__hint")?.textContent).toBe("3 × 2 selected");

    const insert = grid.querySelector<HTMLButtonElement>("[data-insert-table]")!;
    insert.focus();
    await userEvent.keyboard("{Enter}");
    expect(details).toEqual([{ rows: 3, cols: 2, withHeaderRow: true }]);
  });

  it("keeps structural actions visible and the hover overlay keyboard-operable", async () => {
    document.body.innerHTML = `
      <main>
        <ui-editor-table-toolbar open can-add-row-after can-add-column-after can-delete-table></ui-editor-table-toolbar>
        <ui-editor-table-overlay open rows="2" cols="2"></ui-editor-table-overlay>
        <button id="outside" type="button">Outside</button>
      </main>
    `;
    const toolbar = document.querySelector("ui-editor-table-toolbar")!;
    const overlay = document.querySelector("ui-editor-table-overlay")!;
    const tableActions: string[] = [];
    const overlayActions: unknown[] = [];
    toolbar.addEventListener("looma-editor-table-action", (event) => {
      tableActions.push((event as CustomEvent<{ action: string }>).detail.action);
    });
    overlay.addEventListener("looma-editor-table-overlay-action", (event) => {
      overlayActions.push((event as CustomEvent).detail);
    });

    const options = toolbar.querySelector<HTMLButtonElement>("[data-action='toggle-overflow']")!;
    options.focus();
    await userEvent.keyboard("{Enter}");
    const deleteTable = toolbar.querySelector<HTMLButtonElement>("[data-action='delete-table']")!;
    deleteTable.focus();
    await userEvent.keyboard("{Enter}");
    expect(tableActions).toEqual(["delete-table"]);

    const addRow = overlay.querySelector<HTMLButtonElement>("[data-control-key='row:1']")!;
    addRow.focus();
    expect(addRow.dataset.active).toBe("true");
    await userEvent.keyboard("{Enter}");
    expect(overlayActions).toEqual([{ action: "add-row-after", boundaryIndex: 1 }]);
  });

  it("passes automated accessibility checks with no browser exceptions", async () => {
    document.body.innerHTML = `
      <main id="editor-browser-qualification">
        <ui-editor-toolbar><button type="button">Bold</button></ui-editor-toolbar>
        <ui-editor-table-toolbar open can-add-row-after can-add-column-after can-delete-table></ui-editor-table-toolbar>
        <ui-editor-table-context-menu open can-add-row-after can-delete-table></ui-editor-table-context-menu>
        <ui-editor-insert-table-grid open max-rows="3" max-cols="3"></ui-editor-insert-table-grid>
        <ui-editor-table-overlay open rows="2" cols="2"></ui-editor-table-overlay>
      </main>
    `;

    const result = await axe.run(document.getElementById("editor-browser-qualification")!);
    expect(result.violations, result.violations.map((violation) => violation.id).join(", ")).toEqual([]);
  });
});
