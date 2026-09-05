import { userEvent } from "@vitest/browser/context";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../src/editor.css";
import "../src/index";
import type { SlashMenuAnchorRect } from "../src/index";
import { resolveTableCellAt } from "../src/ui";

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("editor release interactions (real browser)", () => {
  it("caps a misconfigured mention menu before rendering a large directory", () => {
    document.body.innerHTML = "<ui-editor-mention-menu></ui-editor-mention-menu>";
    const menu = document.querySelector("ui-editor-mention-menu") as HTMLElement & {
      open: boolean;
      items: Array<{ id: string; label: string }>;
      anchorRect: SlashMenuAnchorRect | null;
    };
    menu.open = true;
    menu.items = Array.from({ length: 1_000 }, (_, index) => ({
      id: `person-${index}`,
      label: `Person ${index}`,
    }));
    menu.anchorRect = new DOMRect(16, 40, 1, 18);

    expect(menu.querySelectorAll('[role="option"]')).toHaveLength(20);
  });

  it("renders a touch-sized mention list and emits the exact selected person", async () => {
    document.body.innerHTML = "<ui-editor-mention-menu></ui-editor-mention-menu>";
    const menu = document.querySelector("ui-editor-mention-menu") as HTMLElement & {
      open: boolean;
      items: Array<{ id: string; label: string; detail?: string; initials?: string }>;
      selectedIndex: number;
      anchorRect: SlashMenuAnchorRect | null;
    };
    menu.open = true;
    menu.items = [
      { id: "ada", label: "Ada Lovelace", detail: "ada@example.com", initials: "AL" },
      { id: "grace", label: "Grace Hopper", detail: "grace@example.com", initials: "GH" },
    ];
    menu.selectedIndex = 1;
    menu.anchorRect = new DOMRect(16, 40, 1, 18);

    const selected: unknown[] = [];
    menu.addEventListener("looma-editor-mention-menu-select", (event) => {
      selected.push((event as CustomEvent).detail);
    });

    const options = menu.querySelectorAll<HTMLElement>('[role="option"]');
    expect(menu.getAttribute("aria-label")).toBe("Mention a person");
    expect(options).toHaveLength(2);
    expect(options[1]?.getAttribute("aria-selected")).toBe("true");
    expect(options[0]?.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    await userEvent.click(options[1]!);
    expect(selected).toEqual([{ index: 1 }]);
  });

  it("keeps the mobile mention menu inside the visible keyboard viewport", () => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(375);
    vi.spyOn(window, "visualViewport", "get").mockReturnValue({
      width: 375,
      height: 420,
      offsetLeft: 0,
      offsetTop: 96,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as VisualViewport);
    document.body.innerHTML = "<ui-editor-mention-menu></ui-editor-mention-menu>";
    const menu = document.querySelector("ui-editor-mention-menu") as HTMLElement & {
      open: boolean;
      items: Array<{ id: string; label: string }>;
      anchorRect: SlashMenuAnchorRect | null;
    };
    menu.open = true;
    menu.items = [{ id: "ada", label: "Ada Lovelace" }];
    menu.anchorRect = new DOMRect(16, 300, 1, 18);

    expect(menu.style.left).toBe("0px");
    expect(menu.style.top).toBe("140px");
    expect(menu.style.width).toBe("375px");
    expect(menu.style.maxHeight).toBe("320px");
  });

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
    slashMenu.items = [{ title: "Paragraph", description: "Plain text", icon: "pilcrow" }];

    const domRect = new DOMRect(12, 24, 30, 18);
    slashMenu.anchorRect = domRect;
    expect(slashMenu.anchorRect).toBe(domRect);
    expect(slashMenu.hidden).toBe(false);
    expect(slashMenu.style.left).toBe("12px");
    expect(slashMenu.style.top).toBe("50px");
    expect(slashMenu.querySelector('[data-looma-icon="pilcrow"]')).toBeTruthy();

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

  it("keeps the mobile slash menu inside the visible keyboard viewport", () => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(375);
    vi.spyOn(window, "visualViewport", "get").mockReturnValue({
      width: 375,
      height: 420,
      offsetLeft: 0,
      offsetTop: 96,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as VisualViewport);
    document.body.innerHTML = "<ui-editor-slash-menu></ui-editor-slash-menu>";
    const slashMenu = document.querySelector("ui-editor-slash-menu") as HTMLElement & {
      open: boolean;
      items: Array<{ title: string; description: string; icon: string }>;
      anchorRect: SlashMenuAnchorRect | null;
    };

    slashMenu.open = true;
    slashMenu.items = [{ title: "Code block", description: "Preformatted code", icon: "braces" }];
    slashMenu.anchorRect = new DOMRect(16, 300, 1, 18);

    expect(slashMenu.style.left).toBe("0px");
    expect(slashMenu.style.top).toBe("140px");
    expect(slashMenu.style.bottom).toBe("");
    expect(slashMenu.style.width).toBe("375px");
    expect(slashMenu.style.maxHeight).toBe("320px");
    expect(slashMenu.querySelector('[data-looma-icon="braces"]')).toBeTruthy();
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

  it("keeps insert-table hover previews responsive without empty grid tracks", async () => {
    document.body.innerHTML = '<ui-editor-insert-table-grid open max-rows="4" max-cols="4"></ui-editor-insert-table-grid>';
    const picker = document.querySelector("ui-editor-insert-table-grid")!;
    const grid = picker.querySelector<HTMLElement>(".ui-editor-insert-table-grid__grid")!;
    const twoByTwo = picker.querySelector<HTMLButtonElement>('[aria-label="2 rows by 2 columns"]')!;
    const fourByOne = picker.querySelector<HTMLButtonElement>('[aria-label="4 rows by 1 columns"]')!;
    const outside = document.createElement("button");
    document.body.append(outside);

    expect(getComputedStyle(grid).gridTemplateColumns.split(" ")).toHaveLength(4);
    expect(getComputedStyle(grid).gridTemplateRows.split(" ")).toHaveLength(4);

    await userEvent.click(twoByTwo);
    expect(picker.querySelector(".ui-editor-insert-table-grid__hint")?.textContent)
      .toBe("2 × 2 selected");

    await userEvent.hover(fourByOne);
    expect(picker.querySelector(".ui-editor-insert-table-grid__hint")?.textContent)
      .toBe("4 × 1");

    await userEvent.hover(outside);
    expect(picker.querySelector(".ui-editor-insert-table-grid__hint")?.textContent)
      .toBe("2 × 2 selected");
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
        <ui-editor-table-overlay
          open
          rows="2"
          cols="2"
          row-boundaries="0,82,200"
          column-boundaries="0,154,400"
          active-cell="0,0,154,82,0,0"
          hovered-cell="154,82,246,118,1,1"
          style="display:block;width:400px;height:200px;margin:60px"
        ></ui-editor-table-overlay>
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
    expect(toolbar.querySelector('[data-action="align-left"] [data-looma-icon="align-left"]')).toBeTruthy();
    expect(toolbar.querySelector('[data-action="toggle-overflow"] [data-looma-icon="chevron-down"]')).toBeTruthy();
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
    expect(addRow.style.top).toBe("82px");
    expect(getComputedStyle(addRow).pointerEvents).toBe("none");
    expect(getComputedStyle(rowHandle).pointerEvents).toBe("auto");
    expect(rowHandle.querySelector('[data-looma-icon="plus"]')).toBeTruthy();
    expect(addRow.querySelector("[data-ui-guide]")).toBeTruthy();
    await userEvent.hover(rowHandle);
    expect(addRow.dataset.active).toBe("true");
    await vi.waitFor(() => expect(getComputedStyle(rowHandle).opacity).toBe("1"));
    rowHandle.focus();
    expect(addRow.dataset.active).toBe("true");
    await userEvent.keyboard("{Enter}");
    expect(overlayActions).toEqual([{ action: "add-row-after", boundaryIndex: 1 }]);

    const cellMenu = overlay.querySelector<HTMLButtonElement>("[data-action='open-cell-menu']")!;
    expect(cellMenu.getAttribute("aria-label")).toBe("Cell actions");
    expect(cellMenu.style.left).toBe("124px");
    expect(cellMenu.style.top).toBe("6px");
    expect(cellMenu.querySelector('[data-looma-icon="chevron-down"]')).toBeTruthy();
    expect(cellMenu.textContent?.trim()).toBe("");
    cellMenu.click();
    expect(overlayActions.at(-1)).toMatchObject({
      action: "open-cell-menu",
      rowIndex: 0,
      columnIndex: 0,
    });

    const rowSelector = overlay.querySelector<HTMLButtonElement>("[data-action='select-row']")!;
    const columnSelector = overlay.querySelector<HTMLButtonElement>("[data-action='select-column']")!;
    expect(rowSelector.title).toBe("Select row");
    expect(columnSelector.title).toBe("Select column");
    expect(rowSelector.style.top).toBe("141px");
    expect(columnSelector.style.left).toBe("277px");
    expect(rowSelector.querySelector('[data-looma-icon="grip-vertical"]')).toBeTruthy();
    expect(columnSelector.querySelector('[data-looma-icon="grip-horizontal"]')).toBeTruthy();
  });

  it("uses the shared floating toolbar frame without sticky or mobile-fixed positioning", () => {
    document.body.innerHTML = '<ui-editor-toolbar floating><button type="button">Bold</button></ui-editor-toolbar>';
    const toolbar = document.querySelector<HTMLElement>("ui-editor-toolbar")!;

    expect(getComputedStyle(toolbar).position).toBe("static");
    expect(getComputedStyle(toolbar).borderTopWidth).toBe("1px");
    expect(getComputedStyle(toolbar).borderBottomWidth).toBe("1px");
    expect(getComputedStyle(toolbar).overflowX).toBe("visible");
  });

  it("resolves logical coordinates through merged table cells", () => {
    document.body.innerHTML = `
      <table>
        <tbody>
          <tr><td id="merged" rowspan="2" colspan="2">Merged</td><td id="right">Right</td></tr>
          <tr><td id="lower-right">Lower right</td></tr>
        </tbody>
      </table>
    `;
    const table = document.querySelector("table")!;
    const merged = document.querySelector<HTMLTableCellElement>("#merged")!;

    expect(resolveTableCellAt(table, 0, 0)).toBe(merged);
    expect(resolveTableCellAt(table, 0, 1)).toBe(merged);
    expect(resolveTableCellAt(table, 1, 0)).toBe(merged);
    expect(resolveTableCellAt(table, 1, 1)).toBe(merged);
    expect(resolveTableCellAt(table, 0, 2)?.id).toBe("right");
    expect(resolveTableCellAt(table, 1, 2)?.id).toBe("lower-right");
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

  it("keeps narrow-screen tables readable inside a horizontal scroll wrapper", () => {
    document.body.innerHTML = '<div class="ProseMirror"><div class="tableWrapper" style="width: 300px"><table><tbody><tr><td>Cell</td><td>Cell</td><td>Cell</td></tr></tbody></table></div></div>';
    const wrapper = document.querySelector<HTMLElement>(".tableWrapper")!;
    const table = wrapper.querySelector<HTMLTableElement>("table")!;
    const cell = document.querySelector<HTMLElement>("td")!;

    expect(getComputedStyle(wrapper).overflowX).toBe("auto");
    expect(Number.parseFloat(getComputedStyle(cell).minWidth)).toBeGreaterThanOrEqual(112);
    expect(table.scrollWidth).toBeGreaterThan(wrapper.clientWidth);
    expect(getComputedStyle(cell).overflowX).not.toBe("auto");
  });

  it("makes mobile editor docks touch-scrollable with snap points", () => {
    document.body.innerHTML = '<div class="looma-editor__mobile-toolbar-shell"><ui-editor-toolbar floating><button type="button">Bold</button><button type="button">Italic</button></ui-editor-toolbar></div>';
    const toolbar = document.querySelector<HTMLElement>("ui-editor-toolbar")!;
    const button = toolbar.querySelector<HTMLElement>("button")!;

    expect(getComputedStyle(toolbar).overflowX).toBe("auto");
    expect(getComputedStyle(toolbar).scrollSnapType).toContain("x");
    expect(getComputedStyle(button).scrollSnapAlign).toBe("start");
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

  it("offers the selected-cell command surface from the shared context menu", () => {
    document.body.innerHTML = `
      <ui-editor-table-context-menu
        open
        can-delete-row
        can-delete-column
      ></ui-editor-table-context-menu>
    `;
    const menu = document.querySelector("ui-editor-table-context-menu")!;
    expect(menu.querySelector("[data-action='clear-cells']")?.textContent).toBe("Clear selected cells");
    expect(menu.querySelector("[data-action='delete-row']")).toBeTruthy();
    expect(menu.querySelector("[data-action='delete-column']")).toBeTruthy();
  });

  it("passes automated accessibility checks with no browser exceptions", async () => {
    document.body.innerHTML = `
      <main id="editor-browser-qualification">
        <ui-editor-mention-menu></ui-editor-mention-menu>
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
