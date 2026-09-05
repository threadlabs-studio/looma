/**
 * ui-editor-table-overlay — anticipatory table affordances.
 * Domain-neutral: it emits intent while the adapter owns editor commands.
 */

import {
  createProximityCoordinator,
  loomaIconMarkup,
  type ProximityCoordinator,
} from "@threadlabs/looma-core";

const TAG = "ui-editor-table-overlay";
const DEFAULT_ROWS = 3;
const DEFAULT_COLS = 3;

export type TableInsertionAction =
  | "add-row-before"
  | "add-row-after"
  | "add-column-before"
  | "add-column-after";

export type TableOverlayAction =
  | TableInsertionAction
  | "select-row"
  | "select-column"
  | "open-cell-menu";

export type TableOverlayActionEventDetail =
  | { action: TableInsertionAction; boundaryIndex: number }
  | { action: "select-row" | "select-column"; rowIndex: number; columnIndex: number }
  | {
      action: "open-cell-menu";
      rowIndex: number;
      columnIndex: number;
      anchor: { left: number; top: number; right: number; bottom: number };
    };

export interface ActiveCellRect {
  left: number;
  top: number;
  width: number;
  height: number;
  rowIndex: number;
  columnIndex: number;
}

export interface TableOverlayGeometry {
  rowBoundaries: number[];
  columnBoundaries: number[];
  activeCell: ActiveCellRect | null;
  hoveredCell?: ActiveCellRect | null;
}

function sameNumbers(left: number[], right: number[]): boolean {
  return left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function sameActiveCell(left: ActiveCellRect | null, right: ActiveCellRect | null): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  return left.left === right.left
    && left.top === right.top
    && left.width === right.width
    && left.height === right.height
    && left.rowIndex === right.rowIndex
    && left.columnIndex === right.columnIndex;
}

function sameGeometry(
  left: TableOverlayGeometry | null,
  right: TableOverlayGeometry | null,
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  return sameNumbers(left.rowBoundaries, right.rowBoundaries)
    && sameNumbers(left.columnBoundaries, right.columnBoundaries)
    && sameActiveCell(left.activeCell, right.activeCell)
    && sameActiveCell(left.hoveredCell ?? null, right.hoveredCell ?? null);
}

function mapTableCells(table: HTMLTableElement): {
  grid: HTMLTableCellElement[][];
  coordinates: Map<HTMLTableCellElement, { rowIndex: number; columnIndex: number }>;
} {
  const rows = Array.from(table.rows);
  const grid: HTMLTableCellElement[][] = [];
  const coordinates = new Map<HTMLTableCellElement, { rowIndex: number; columnIndex: number }>();

  rows.forEach((row, rowIndex) => {
    grid[rowIndex] ??= [];
    let columnIndex = 0;
    for (const cell of Array.from(row.cells)) {
      while (grid[rowIndex]?.[columnIndex]) columnIndex += 1;
      coordinates.set(cell, { rowIndex, columnIndex });
      const rowSpan = cell.rowSpan === 0 ? rows.length - rowIndex : Math.max(1, cell.rowSpan);
      const columnSpan = Math.max(1, cell.colSpan);
      for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
        const gridRow = grid[rowIndex + rowOffset] ??= [];
        for (let columnOffset = 0; columnOffset < columnSpan; columnOffset += 1) {
          gridRow[columnIndex + columnOffset] = cell;
        }
      }
      columnIndex += columnSpan;
    }
  });

  return { grid, coordinates };
}

/** Resolves a logical table coordinate, including cells that span rows or columns. */
export function resolveTableCellAt(
  table: HTMLTableElement,
  rowIndex: number,
  columnIndex: number,
): HTMLTableCellElement | null {
  return mapTableCells(table).grid[rowIndex]?.[columnIndex] ?? null;
}

function uniqueSorted(values: number[]): number[] {
  return values
    .sort((left, right) => left - right)
    .filter((value, index, all) => index === 0 || Math.abs(value - (all[index - 1] ?? value)) >= 0.5)
    .map((value) => Math.round(value * 100) / 100);
}

/** Measures real rendered boundaries, including non-uniform and merged cells. */
export function measureTableOverlayGeometry(
  table: HTMLTableElement,
  activeCell: HTMLTableCellElement | null,
  hoveredCell: HTMLTableCellElement | null = null,
): TableOverlayGeometry {
  const tableRect = table.getBoundingClientRect();
  const rows = Array.from(table.rows);
  const cells = rows.flatMap((row) => Array.from(row.cells));
  const { coordinates } = mapTableCells(table);
  const rowBoundaries = uniqueSorted(rows.flatMap((row) => {
    const rect = row.getBoundingClientRect();
    return [rect.top - tableRect.top, rect.bottom - tableRect.top];
  }));
  const columnBoundaries = uniqueSorted(cells.flatMap((cell) => {
    const rect = cell.getBoundingClientRect();
    return [rect.left - tableRect.left, rect.right - tableRect.left];
  }));

  if (!activeCell || !table.contains(activeCell)) {
    return {
      rowBoundaries,
      columnBoundaries,
      activeCell: null,
      hoveredCell: measureCellRect(table, hoveredCell, coordinates),
    };
  }

  return {
    rowBoundaries,
    columnBoundaries,
    activeCell: measureCellRect(table, activeCell, coordinates),
    hoveredCell: measureCellRect(table, hoveredCell, coordinates),
  };
}

function measureCellRect(
  table: HTMLTableElement,
  cell: HTMLTableCellElement | null,
  coordinates: Map<HTMLTableCellElement, { rowIndex: number; columnIndex: number }>,
): ActiveCellRect | null {
  if (!cell || !table.contains(cell)) return null;
  const tableRect = table.getBoundingClientRect();
  const cellRect = cell.getBoundingClientRect();
  const coordinate = coordinates.get(cell);
  return {
    left: Math.round((cellRect.left - tableRect.left) * 100) / 100,
    top: Math.round((cellRect.top - tableRect.top) * 100) / 100,
    width: Math.round(cellRect.width * 100) / 100,
    height: Math.round(cellRect.height * 100) / 100,
    rowIndex: coordinate?.rowIndex ?? 0,
    columnIndex: coordinate?.columnIndex ?? 0,
  };
}

function finiteNumbers(value: string | null): number[] {
  if (!value) return [];
  const values = value.split(",").map((part) => Number(part.trim()));
  return values.every(Number.isFinite) ? values : [];
}

function fallbackBoundaries(segments: number, length: number): number[] {
  return Array.from({ length: segments + 1 }, (_, index) => (index * length) / segments);
}

if (typeof HTMLElement !== "undefined") {
class UIEditorTableOverlayElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["open", "rows", "cols", "row-boundaries", "column-boundaries", "active-cell", "hovered-cell"];
  }

  #rows = DEFAULT_ROWS;
  #cols = DEFAULT_COLS;
  #activeControlKey: string | null = null;
  #proximity: ProximityCoordinator | null = null;
  #geometry: TableOverlayGeometry | null = null;
  #renderPending = false;

  get geometry(): TableOverlayGeometry | null {
    return this.#geometry;
  }

  set geometry(value: TableOverlayGeometry | null) {
    if (sameGeometry(this.#geometry, value)) return;
    this.#geometry = value;
    this.#scheduleRender();
  }

  connectedCallback(): void {
    this.#rows = this.#readBoundedNumber("rows", DEFAULT_ROWS);
    this.#cols = this.#readBoundedNumber("cols", DEFAULT_COLS);
    this.render();
    this.addEventListener("click", this.onClick);
    this.addEventListener("pointerover", this.onPointerOver);
    this.addEventListener("pointerout", this.onPointerOut);
    this.addEventListener("focusin", this.onFocusIn);
    this.addEventListener("focusout", this.onFocusOut);
    this.#proximity = createProximityCoordinator(this, {
      pointerTarget: this.ownerDocument,
      anchorSelector: ".ui-editor-table-overlay__handle[data-ui-affordance]",
    });
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this.onClick);
    this.removeEventListener("pointerover", this.onPointerOver);
    this.removeEventListener("pointerout", this.onPointerOut);
    this.removeEventListener("focusin", this.onFocusIn);
    this.removeEventListener("focusout", this.onFocusOut);
    this.#proximity?.destroy();
    this.#proximity = null;
  }

  attributeChangedCallback(name: string): void {
    if (name === "rows") this.#rows = this.#readBoundedNumber("rows", DEFAULT_ROWS);
    if (name === "cols") this.#cols = this.#readBoundedNumber("cols", DEFAULT_COLS);
    this.#scheduleRender();
  }

  #scheduleRender(): void {
    if (!this.isConnected || this.#renderPending) return;
    this.#renderPending = true;
    queueMicrotask(() => {
      this.#renderPending = false;
      if (this.isConnected) this.render();
    });
  }

  #readBoundedNumber(name: string, fallback: number): number {
    const parsed = Number.parseInt(this.getAttribute(name) ?? String(fallback), 10);
    return Number.isFinite(parsed) ? Math.min(100, Math.max(1, parsed)) : fallback;
  }

  #boundaries(name: "row-boundaries" | "column-boundaries", segments: number): number[] {
    if (this.#geometry) {
      return name === "row-boundaries"
        ? this.#geometry.rowBoundaries
        : this.#geometry.columnBoundaries;
    }
    const explicit = finiteNumbers(this.getAttribute(name));
    if (explicit.length === segments + 1) return explicit;
    const length = name === "row-boundaries"
      ? this.getBoundingClientRect().height
      : this.getBoundingClientRect().width;
    return fallbackBoundaries(segments, length);
  }

  #activeCell(): ActiveCellRect | null {
    if (this.#geometry) return this.#geometry.activeCell;
    const values = finiteNumbers(this.getAttribute("active-cell"));
    if (values.length !== 6) return null;
    const [left, top, width, height, rowIndex, columnIndex] = values;
    if (
      left === undefined || top === undefined || width === undefined || height === undefined
      || rowIndex === undefined || columnIndex === undefined
    ) return null;
    return { left, top, width, height, rowIndex, columnIndex };
  }

  #hoveredCell(): ActiveCellRect | null {
    if (this.#geometry) return this.#geometry.hoveredCell ?? null;
    const values = finiteNumbers(this.getAttribute("hovered-cell"));
    if (values.length !== 6) return null;
    const [left, top, width, height, rowIndex, columnIndex] = values;
    if (
      left === undefined || top === undefined || width === undefined || height === undefined
      || rowIndex === undefined || columnIndex === undefined
    ) return null;
    return { left, top, width, height, rowIndex, columnIndex };
  }

  private dispatch(detail: TableOverlayActionEventDetail): void {
    this.dispatchEvent(new CustomEvent<TableOverlayActionEventDetail>(
      "looma-editor-table-overlay-action",
      { detail, bubbles: true, composed: true },
    ));
  }

  private onClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-action]");
    if (!target) return;
    const action = target.dataset.action as TableOverlayAction | undefined;
    if (!action) return;

    if (action === "select-row" || action === "select-column") {
      const rowIndex = Number.parseInt(target.dataset.rowIndex ?? "", 10);
      const columnIndex = Number.parseInt(target.dataset.columnIndex ?? "", 10);
      if (Number.isFinite(rowIndex) && Number.isFinite(columnIndex)) {
        this.dispatch({ action, rowIndex, columnIndex });
      }
      return;
    }

    if (action === "open-cell-menu") {
      const rowIndex = Number.parseInt(target.dataset.rowIndex ?? "", 10);
      const columnIndex = Number.parseInt(target.dataset.columnIndex ?? "", 10);
      if (!Number.isFinite(rowIndex) || !Number.isFinite(columnIndex)) return;
      const rect = target.getBoundingClientRect();
      this.dispatch({
        action,
        rowIndex,
        columnIndex,
        anchor: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
      });
      return;
    }

    const boundaryIndex = Number.parseInt(target.dataset.boundaryIndex ?? "", 10);
    if (!Number.isFinite(boundaryIndex) || boundaryIndex < 0) return;
    this.dispatch({ action, boundaryIndex });
  };

  private onPointerOver = (event: PointerEvent): void => {
    const control = (event.target as HTMLElement).closest<HTMLElement>("[data-control-key]");
    this.#setActiveControl(control?.dataset.controlKey ?? null);
  };

  private onPointerOut = (event: PointerEvent): void => {
    const related = event.relatedTarget;
    const next = related instanceof Element
      ? related.closest<HTMLElement>("[data-control-key]")
      : null;
    this.#setActiveControl(next?.dataset.controlKey ?? null);
  };

  private onFocusIn = (event: FocusEvent): void => {
    const control = (event.target as HTMLElement).closest<HTMLElement>("[data-control-key]");
    this.#setActiveControl(control?.dataset.controlKey ?? null);
  };

  private onFocusOut = (event: FocusEvent): void => {
    const related = event.relatedTarget;
    const next = related instanceof Element
      ? related.closest<HTMLElement>("[data-control-key]")
      : null;
    this.#setActiveControl(next?.dataset.controlKey ?? null);
  };

  #setActiveControl(controlKey: string | null): void {
    if (this.#activeControlKey === controlKey) return;
    this.#activeControlKey = controlKey;
    this.#syncActiveControl();
  }

  #syncActiveControl(): void {
    this.querySelectorAll<HTMLElement>("[data-control-key]").forEach((control) => {
      control.dataset.active = this.#activeControlKey === control.dataset.controlKey ? "true" : "false";
    });
  }

  #insertionControl(axis: "row" | "col", index: number, position: number): string {
    const first = index === 0;
    const action: TableInsertionAction = axis === "row"
      ? (first ? "add-row-before" : "add-row-after")
      : (first ? "add-column-before" : "add-column-after");
    const noun = axis === "row" ? "row" : "column";
    const relation = first ? (axis === "row" ? "above" : "left") : (axis === "row" ? "below" : "right");
    const label = `Insert ${noun} ${relation}`;
    const controlKey = `${axis}:${index}`;
    const positionStyle = axis === "row" ? `top:${position}px;` : `left:${position}px;`;
    return [
      `<div class="ui-editor-table-overlay__control ui-editor-table-overlay__control--${axis}"`,
      ` style="${positionStyle}" data-control-key="${controlKey}"`,
      ` data-active="${this.#activeControlKey === controlKey ? "true" : "false"}">`,
      '<span class="ui-editor-table-overlay__line" aria-hidden="true"></span>',
      '<span class="ui-editor-table-overlay__guide" data-ui-guide aria-hidden="true"></span>',
      `<button type="button" class="ui-editor-table-overlay__handle" data-ui-affordance="insert-${noun}"`,
      ` data-action="${action}" data-boundary-index="${index}" aria-label="${label}">`,
      loomaIconMarkup("plus"),
      `<span class="ui-editor-table-overlay__tooltip" role="tooltip">${label}</span>`,
      "</button>",
      "</div>",
    ].join("");
  }

  #cellSelectors(cell: ActiveCellRect): string {
    const centerX = cell.left + (cell.width / 2);
    const centerY = cell.top + (cell.height / 2);
    const indexes = `data-row-index="${cell.rowIndex}" data-column-index="${cell.columnIndex}"`;
    return [
      `<button type="button" class="ui-editor-table-overlay__selector ui-editor-table-overlay__selector--row" style="top:${centerY}px" data-action="select-row" ${indexes} title="Select row" aria-label="Select row">${loomaIconMarkup("grip-vertical")}</button>`,
      `<button type="button" class="ui-editor-table-overlay__selector ui-editor-table-overlay__selector--column" style="left:${centerX}px" data-action="select-column" ${indexes} title="Select column" aria-label="Select column">${loomaIconMarkup("grip-horizontal")}</button>`,
    ].join("");
  }

  #cellMenu(cell: ActiveCellRect): string {
    const indexes = `data-row-index="${cell.rowIndex}" data-column-index="${cell.columnIndex}"`;
    return `<button type="button" class="ui-editor-table-overlay__cell-menu" style="left:${cell.left + cell.width - 30}px;top:${cell.top + 6}px" data-action="open-cell-menu" ${indexes} title="Cell actions" aria-label="Cell actions">${loomaIconMarkup("chevron-down")}</button>`;
  }

  private render(): void {
    const open = this.hasAttribute("open") && this.getAttribute("open") !== "false";
    this.hidden = !open;
    if (!open) {
      this.#setActiveControl(null);
      return;
    }

    const rows = this.#boundaries("row-boundaries", this.#rows);
    const columns = this.#boundaries("column-boundaries", this.#cols);
    const activeCell = this.#activeCell();
    const hoveredCell = this.#hoveredCell();
    this.innerHTML = [
      '<div class="ui-editor-table-overlay" aria-label="Table controls">',
      '<div class="ui-editor-table-overlay__rows">',
      rows.map((position, index) => this.#insertionControl("row", index, position)).join(""),
      "</div>",
      '<div class="ui-editor-table-overlay__cols">',
      columns.map((position, index) => this.#insertionControl("col", index, position)).join(""),
      "</div>",
      hoveredCell ? this.#cellSelectors(hoveredCell) : "",
      activeCell ? this.#cellMenu(activeCell) : "",
      "</div>",
    ].join("");
    this.#syncActiveControl();
    this.#proximity?.refresh();
  }
}

if (typeof window !== "undefined" && !customElements.get(TAG)) {
  customElements.define(TAG, UIEditorTableOverlayElement);
}
}
