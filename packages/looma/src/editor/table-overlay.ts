/**
 * Table overlay action and geometry contracts, and the measurements the editor supplies to
 * ui-editor-table-overlay.
 */

/** Table-structure mutations addressed by a measured row/column boundary. */
export type TableInsertionAction =
  | "add-row-before"
  | "add-row-after"
  | "add-column-before"
  | "add-column-after";

/**
 * Intent vocabulary emitted by the headless table overlay.
 * UI stays independent of Tiptap/ProseMirror positions; adapters translate
 * these logical coordinates with `handleTableOverlayAction`.
 */
export type TableOverlayAction =
  | TableInsertionAction
  | "select-row"
  | "select-column"
  | "open-cell-menu";

/**
 * Discriminated action payload.
 * Boundary indices refer to entries in the measured boundary arrays. Cell
 * indices refer to the logical grid after row/column spans are expanded. The
 * menu anchor uses CSS-pixel viewport coordinates suitable for fixed surfaces.
 */
export type TableOverlayActionEventDetail =
  | { action: TableInsertionAction; boundaryIndex: number }
  | { action: "select-row" | "select-column"; rowIndex: number; columnIndex: number }
  | {
      action: "open-cell-menu";
      rowIndex: number;
      columnIndex: number;
      anchor: { left: number; top: number; right: number; bottom: number };
    };

/**
 * A cell rectangle relative to the table's border box, plus logical grid
 * coordinates. Width/height include spans because they come from the rendered
 * cell rather than an inferred uniform grid.
 */
export interface ActiveCellRect {
  left: number;
  top: number;
  width: number;
  height: number;
  rowIndex: number;
  columnIndex: number;
}

/**
 * Replaceable geometry snapshot for overlay rendering.
 * Boundaries are CSS-pixel offsets relative to the table; callers should
 * remeasure after editor transactions or layout changes rather than mutate the
 * arrays in place.
 */
export interface TableOverlayGeometry {
  rowBoundaries: number[];
  columnBoundaries: number[];
  activeCell: ActiveCellRect | null;
  hoveredCell?: ActiveCellRect | null;
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

/**
 * Resolves a logical grid coordinate to its owning DOM cell.
 * A spanning cell can therefore be returned for more than one coordinate; this
 * is intentional and prevents overlay actions from inventing nonexistent cells.
 *
 * @contract Coordinates outside the expanded table grid return null; coordinates
 * covered by a span resolve to the single DOM cell that owns them.
 */
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

/**
 * Measures rendered boundaries rather than assuming a uniform table grid.
 * Returned offsets are table-relative and rounded to hundredths of a CSS pixel
 * to suppress observer churn without losing subpixel layout fidelity.
 *
 * @contract Active and hovered rectangles are returned only for cells contained
 * by the supplied table; detached or foreign cells are represented as null.
 */
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

