import { userEvent } from "@vitest/browser/context";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../src/editor.css";
import "../src/index";
import type { SlashMenuAnchorRect } from "../src/index";

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("editor release interactions (real browser)", () => {
  it("positions the slash menu from DOMRect and Tiptap rect-like anchors", () => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(1280);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(720);
    document.body.innerHTML = "<ui-editor-slash-menu></ui-editor-slash-menu>";
    const slashMenu = document.querySelector("ui-editor-slash-menu") as HTMLElement & {
      open: boolean;
      items: Array<{ title: string; description: string; icon: string }>;
      anchorRect: SlashMenuAnchorRect | null;
    };
    slashMenu.open = true;
    slashMenu.items = [{ title: "Paragraph", description: "Plain text", icon: "paragraph" }];

    const domRect = new DOMRect(12, 24, 30, 18);
    slashMenu.anchorRect = domRect;
    expect(slashMenu.anchorRect).toBe(domRect);
    expect(slashMenu.hidden).toBe(false);
    expect(slashMenu.style.left).toBe("12px");
    expect(slashMenu.style.top).toBe("50px");

    const tiptapRect = {
      x: 64,
      y: 80,
      width: 1,
      height: 16,
      top: 80,
      right: 65,
      bottom: 96,
      left: 64,
    };
    slashMenu.anchorRect = tiptapRect;
    expect(slashMenu.anchorRect).toBe(tiptapRect);
    expect(slashMenu.hidden).toBe(false);
    expect(slashMenu.style.left).toBe("64px");
    expect(slashMenu.style.top).toBe("104px");
  });

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

  it("keeps cell and structural actions visible and the hover overlay operable", async () => {
    document.body.innerHTML = `
      <main>
        <ui-editor-table-toolbar
          open
          cell-background="#fef3c7"
          can-add-row-after
          can-add-column-after
          can-delete-table
          can-merge-cells
          can-split-cell
        ></ui-editor-table-toolbar>
        <ui-editor-table-overlay open rows="2" cols="2" style="display:block;width:400px;height:200px"></ui-editor-table-overlay>
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

    toolbar.querySelector<HTMLButtonElement>("[data-action='toggle-overflow']")!.focus();
    await userEvent.keyboard("{Enter}");
    const deleteTable = toolbar.querySelector<HTMLButtonElement>("[data-action='delete-table']")!;
    deleteTable.focus();
    await userEvent.keyboard("{Enter}");
    expect(tableActions).toEqual(["delete-table"]);

    toolbar.querySelector<HTMLButtonElement>("[data-action='toggle-overflow']")!.focus();
    await userEvent.keyboard("{Enter}");
    const yellowBackground = toolbar.querySelector<HTMLButtonElement>("[data-action='background-yellow']")!;
    expect(yellowBackground.getAttribute("aria-checked")).toBe("true");
    yellowBackground.click();
    expect(tableActions).toEqual(["delete-table", "background-yellow"]);

    toolbar.querySelector<HTMLButtonElement>("[data-action='toggle-overflow']")!.focus();
    await userEvent.keyboard("{Enter}");
    toolbar.querySelector<HTMLButtonElement>("[data-action='merge-cells']")!.click();
    expect(tableActions).toEqual(["delete-table", "background-yellow", "merge-cells"]);

    toolbar.querySelector<HTMLButtonElement>("[data-action='toggle-overflow']")!.focus();
    await userEvent.keyboard("{Enter}");
    toolbar.querySelector<HTMLButtonElement>("[data-action='split-cell']")!.click();
    expect(tableActions).toEqual(["delete-table", "background-yellow", "merge-cells", "split-cell"]);

    const addRow = overlay.querySelector<HTMLButtonElement>("[data-control-key='row:1']")!;
    const rowHandle = addRow.querySelector<HTMLElement>(".ui-editor-table-overlay__handle")!;
    expect(addRow.style.getPropertyValue("--ui-editor-table-overlay-boundary-index")).toBe("1");
    expect(addRow.style.getPropertyValue("--ui-editor-table-overlay-segments")).toBe("2");
    expect(getComputedStyle(addRow).pointerEvents).toBe("auto");
    expect(getComputedStyle(rowHandle).pointerEvents).toBe("auto");
    await userEvent.hover(addRow);
    expect(addRow.dataset.active).toBe("true");
    await vi.waitFor(() => expect(getComputedStyle(rowHandle).opacity).toBe("1"));
    addRow.focus();
    expect(addRow.dataset.active).toBe("true");
    await userEvent.keyboard("{Enter}");
    expect(overlayActions).toEqual([{ action: "add-row-after", boundaryIndex: 1 }]);
  });

  it("uses the shared floating toolbar frame without sticky or mobile-fixed positioning", () => {
    document.body.innerHTML = '<ui-editor-toolbar floating><button type="button">Bold</button></ui-editor-toolbar>';
    const toolbar = document.querySelector<HTMLElement>("ui-editor-toolbar")!;

    expect(getComputedStyle(toolbar).position).toBe("static");
    expect(getComputedStyle(toolbar).borderTopWidth).toBe("1px");
    expect(getComputedStyle(toolbar).borderBottomWidth).toBe("1px");
    expect(getComputedStyle(toolbar).overflowX).toBe("visible");
  });

  it("suppresses ProseMirror's blue node-selection outline for tables", () => {
    document.body.innerHTML = '<div class="ProseMirror"><table class="ProseMirror-selectednode"><tbody><tr><td>Cell</td></tr></tbody></table></div>';
    const table = document.querySelector<HTMLElement>("table")!;

    expect(getComputedStyle(table).outlineStyle).toBe("none");
  });

  it("does not add trailing paragraph space inside table cells", () => {
    document.body.innerHTML = '<div class="ProseMirror"><table><tbody><tr><td><p>Cell</p></td></tr></tbody></table></div>';
    const paragraph = document.querySelector<HTMLElement>("td > p")!;

    expect(getComputedStyle(paragraph).marginBottom).toBe("0px");
  });

  it("keeps the table context menu inside the viewport near the bottom-right edge", async () => {
    const shell = document.createElement("div");
    shell.style.position = "fixed";
    shell.style.top = `${window.innerHeight - 8}px`;
    shell.style.left = `${window.innerWidth - 8}px`;
    shell.innerHTML = `
      <ui-editor-table-context-menu
        open
        can-add-row-before
        can-add-row-after
        can-add-column-before
        can-add-column-after
        can-delete-row
        can-delete-column
        can-delete-table
        can-merge-cells
        can-split-cell
      ></ui-editor-table-context-menu>
    `;
    document.body.append(shell);

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const menu = shell.querySelector<HTMLElement>(".ui-editor-table-context-menu")!;
    const rect = menu.getBoundingClientRect();
    expect(rect.left).toBeGreaterThanOrEqual(12);
    expect(rect.top).toBeGreaterThanOrEqual(12);
    expect(rect.right).toBeLessThanOrEqual(window.innerWidth - 12);
    expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight - 12);
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
