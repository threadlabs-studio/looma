/**
 * Table overlay action handler — maps boundaryIndex to Tiptap table commands.
 * Use with looma-editor-table-overlay-action: call this from the adapter's handler.
 */

import type { Editor, Range } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import {
  addColumn,
  addRow,
  CellSelection,
  cellAround,
  deleteCellSelection,
  TableMap,
  type TableRect,
} from "@tiptap/pm/tables";
import type { TableContextMenuActionEventDetail } from "../table-context-menu";
import type { TableOverlayActionEventDetail } from "../table-overlay";
import {
  getActiveTableCellAlignment,
  getActiveTableCellBackground,
  setActiveTableCellAlignment,
  setActiveTableCellBackground,
  TABLE_CELL_BACKGROUND_PRESETS,
  type TableCellAlignment,
  type TableCellBackground,
} from "./table-formatting";

type TableNode = ReturnType<Editor["state"]["selection"]["$from"]["node"]>;

export interface InsertTableAtRangeOptions {
  rows?: number;
  cols?: number;
  withHeaderRow?: boolean;
}

export interface TableActionCapabilities {
  canAddRowBefore: boolean;
  canAddRowAfter: boolean;
  canAddColumnBefore: boolean;
  canAddColumnAfter: boolean;
  canDeleteRow: boolean;
  canDeleteColumn: boolean;
  canDeleteTable: boolean;
  canMergeCells: boolean;
  canSplitCell: boolean;
}

export interface ActiveTableUiState {
  active: boolean;
  showToolbar: boolean;
  cellAlignment: TableCellAlignment;
  cellBackground: TableCellBackground;
  capabilities: TableActionCapabilities;
}

const NO_TABLE_CAPABILITIES: TableActionCapabilities = {
  canAddRowBefore: false,
  canAddRowAfter: false,
  canAddColumnBefore: false,
  canAddColumnAfter: false,
  canDeleteRow: false,
  canDeleteColumn: false,
  canDeleteTable: false,
  canMergeCells: false,
  canSplitCell: false,
};

/** Text formatting belongs to actual text selections, not table CellSelections. */
export function shouldShowTextFormattingToolbar(
  editor: Editor,
  from = editor.state.selection.from,
  to = editor.state.selection.to
): boolean {
  return editor.isEditable
    && editor.state.selection instanceof TextSelection
    && from !== to;
}

/** Returns Looma's complete interaction state for the table containing the selection. */
export function getActiveTableUiState(editor: Editor): ActiveTableUiState {
  const active = editor.isActive("table");
  if (!active) {
    return {
      active: false,
      showToolbar: false,
      cellAlignment: "left",
      cellBackground: null,
      capabilities: { ...NO_TABLE_CAPABILITIES },
    };
  }

  return {
    active: true,
    showToolbar: true,
    cellAlignment: getActiveTableCellAlignment(editor),
    cellBackground: getActiveTableCellBackground(editor),
    capabilities: {
      canAddRowBefore: editor.can().addRowBefore(),
      canAddRowAfter: editor.can().addRowAfter(),
      canAddColumnBefore: editor.can().addColumnBefore(),
      canAddColumnAfter: editor.can().addColumnAfter(),
      canDeleteRow: editor.can().deleteRow(),
      canDeleteColumn: editor.can().deleteColumn(),
      canDeleteTable: editor.can().deleteTable(),
      canMergeCells: editor.can().mergeCells(),
      canSplitCell: editor.can().splitCell(),
    },
  };
}

/** Executes a toolbar/context-menu action using Looma's table behavior policy. */
export function handleTableAction(
  editor: Editor,
  detail: TableContextMenuActionEventDetail
): boolean {
  switch (detail.action) {
    case "align-left":
      return setActiveTableCellAlignment(editor, "left");
    case "align-center":
      return setActiveTableCellAlignment(editor, "center");
    case "align-right":
      return setActiveTableCellAlignment(editor, "right");
    case "background-none":
      return setActiveTableCellBackground(editor, TABLE_CELL_BACKGROUND_PRESETS.none);
    case "background-gray":
      return setActiveTableCellBackground(editor, TABLE_CELL_BACKGROUND_PRESETS.gray);
    case "background-yellow":
      return setActiveTableCellBackground(editor, TABLE_CELL_BACKGROUND_PRESETS.yellow);
    case "background-blue":
      return setActiveTableCellBackground(editor, TABLE_CELL_BACKGROUND_PRESETS.blue);
    case "background-green":
      return setActiveTableCellBackground(editor, TABLE_CELL_BACKGROUND_PRESETS.green);
    case "background-red":
      return setActiveTableCellBackground(editor, TABLE_CELL_BACKGROUND_PRESETS.red);
    case "add-row-before":
      return editor.chain().focus().addRowBefore().run();
    case "add-row-after":
      return editor.chain().focus().addRowAfter().run();
    case "add-column-before":
      return editor.chain().focus().addColumnBefore().run();
    case "add-column-after":
      return editor.chain().focus().addColumnAfter().run();
    case "delete-row":
      return editor.chain().focus().deleteRow().run();
    case "delete-column":
      return editor.chain().focus().deleteColumn().run();
    case "delete-table":
      return editor.chain().focus().deleteTable().run();
    case "clear-cells": {
      if (!(editor.state.selection instanceof CellSelection)) {
        const cellPos = findSelectedCellPosition(editor);
        if (cellPos === null) return false;
        if (!editor.commands.setCellSelection({ anchorCell: cellPos })) return false;
      }
      return deleteCellSelection(editor.state, editor.view.dispatch);
    }
    case "merge-cells":
      return editor.chain().focus().mergeCells().run();
    case "split-cell":
      return editor.chain().focus().splitCell().run();
  }
}

function arrayEquals(left: number[] | null | undefined, right: number[]): boolean {
  if (!left || left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function readRenderedColumnWidths(tableElement: HTMLTableElement): number[] {
  const colElements = Array.from(tableElement.querySelectorAll("colgroup col"));
  if (colElements.length > 0) {
    return colElements.map((column) => Math.max(1, Math.round(column.getBoundingClientRect().width)));
  }

  const firstRow = tableElement.rows.item(0);
  if (!firstRow) {
    return [];
  }

  return Array.from(firstRow.cells).map((cell) => Math.max(1, Math.round(cell.getBoundingClientRect().width)));
}

function distributeWidthDelta(widths: number[], availableWidth: number, minWidth: number): number[] {
  const normalized = [...widths];
  let delta = availableWidth - normalized.reduce((sum, width) => sum + width, 0);

  while (delta !== 0) {
    const adjustableIndices = normalized
      .map((width, index) => ({ width, index }))
      .filter(({ width }) => delta > 0 || width > minWidth)
      .sort((left, right) => {
        if (delta > 0) {
          return left.width - right.width;
        }
        return right.width - left.width;
      });

    if (adjustableIndices.length === 0) {
      break;
    }

    for (const { index } of adjustableIndices) {
      if (delta === 0) {
        break;
      }

      const currentWidth = normalized[index];
      if (currentWidth === undefined) {
        continue;
      }

      if (delta > 0) {
        normalized[index] = currentWidth + 1;
        delta -= 1;
        continue;
      }

      if (currentWidth <= minWidth) {
        continue;
      }

      normalized[index] = currentWidth - 1;
      delta += 1;
    }
  }

  return normalized;
}

function normalizeColumnWidths(widths: number[], availableWidth: number, minWidth: number): number[] {
  if (widths.length === 0 || availableWidth <= 0) {
    return widths;
  }

  const totalWidth = widths.reduce((sum, width) => sum + width, 0);
  if (totalWidth <= 0) {
    return widths;
  }

  const scaled = widths.map((width) =>
    Math.max(minWidth, Math.round((width / totalWidth) * availableWidth))
  );

  return distributeWidthDelta(scaled, availableWidth, minWidth);
}

/**
 * Finds the table containing the current selection and returns its position and node.
 */
function findTable(editor: Editor): { pos: number; node: ReturnType<Editor["state"]["selection"]["$from"]["node"]> } | null {
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === "table") {
      return { pos: $from.before(d), node };
    }
  }
  return null;
}

function findSelectedCellPosition(editor: Editor): number | null {
  return cellAround(editor.state.selection.$from)?.pos ?? null;
}

function selectTableAxis(
  editor: Editor,
  axis: "row" | "column",
  rowIndex: number,
  columnIndex: number,
): boolean {
  const tableInfo = findTable(editor);
  if (!tableInfo) return false;
  const { pos: tablePos, node: table } = tableInfo;
  const map = TableMap.get(table);
  const row = Math.min(Math.max(0, rowIndex), map.height - 1);
  const column = Math.min(Math.max(0, columnIndex), map.width - 1);
  const start = axis === "row"
    ? map.positionAt(row, 0, table)
    : map.positionAt(0, column, table);
  const end = axis === "row"
    ? map.positionAt(row, map.width - 1, table)
    : map.positionAt(map.height - 1, column, table);
  const tableStart = tablePos + 1;
  if (!editor.commands.setCellSelection({
    anchorCell: tableStart + start,
    headCell: tableStart + end,
  })) return false;
  editor.commands.focus();
  return true;
}

/**
 * Deletes a slash-command range (or other inline trigger text) and inserts a table.
 * Use this when apps want a stable default `/table` behavior without owning table policy.
 */
export function insertTableAtRange(
  editor: Editor,
  range: Range,
  options: InsertTableAtRangeOptions = {}
): boolean {
  const rows = Math.min(10, Math.max(1, options.rows ?? 3));
  const cols = Math.min(10, Math.max(1, options.cols ?? 3));
  const withHeaderRow = options.withHeaderRow ?? true;

  return editor
    .chain()
    .focus()
    .deleteRange(range)
    .insertTable({ rows, cols, withHeaderRow })
    .run();
}

/**
 * Reconciles rendered column widths back into table-cell colwidth attrs so a resized
 * full-width table stays inside the editor width after resize completes.
 */
export function normalizeActiveTableColumnWidths(
  editor: Editor,
  tableElement: HTMLTableElement,
  minWidth = 25
): boolean {
  const tableInfo = findTable(editor);
  if (!tableInfo) {
    return false;
  }

  const renderedColumnWidths = readRenderedColumnWidths(tableElement);
  if (renderedColumnWidths.length === 0) {
    return false;
  }

  const availableWidth = Math.max(1, Math.round(tableElement.getBoundingClientRect().width));
  const normalizedColumnWidths = normalizeColumnWidths(
    renderedColumnWidths,
    availableWidth,
    minWidth
  );

  const { pos: tablePos, node: table } = tableInfo;
  const map = TableMap.get(table);
  const tableStart = tablePos + 1;
  let tr = editor.state.tr;
  let changed = false;

  for (let row = 0; row < map.height; row += 1) {
    for (let col = 0; col < map.width; col += 1) {
      const mapIndex = row * map.width + col;
      const cellPos = map.map[mapIndex];
      if (cellPos === undefined) {
        continue;
      }

      if (
        (col > 0 && map.map[mapIndex - 1] === cellPos)
        || (row > 0 && map.map[mapIndex - map.width] === cellPos)
      ) {
        continue;
      }

      const cellNode = table.nodeAt(cellPos);
      if (!cellNode) {
        continue;
      }

      const startCol = map.colCount(cellPos);
      const cellWidths = normalizedColumnWidths.slice(startCol, startCol + cellNode.attrs.colspan);
      if (cellWidths.length !== cellNode.attrs.colspan || arrayEquals(cellNode.attrs.colwidth, cellWidths)) {
        continue;
      }

      tr = tr.setNodeMarkup(tableStart + cellPos, null, {
        ...cellNode.attrs,
        colwidth: cellWidths,
      });
      changed = true;
    }
  }

  if (changed) {
    editor.view.dispatch(tr);
  }

  return changed;
}

/**
 * Handles a table overlay action by selecting the target cell and running the Tiptap command.
 * Call this from your adapter's onTableOverlayAction handler.
 *
 * @example
 * ```vue
 * <EditorTableOverlay
 *   :open="tableOverlayOpen"
 *   :rows="tableRows"
 *   :cols="tableCols"
 *   @looma-editor-table-overlay-action="(e) => handleTableOverlayAction(editor, e.detail)"
 * />
 * ```
 */
export function handleTableOverlayAction(
  editor: Editor,
  detail: TableOverlayActionEventDetail
): boolean {
  const tableInfo = findTable(editor);
  if (!tableInfo) return false;

  const { action } = detail;
  if (action === "select-row" || action === "select-column") {
    return selectTableAxis(
      editor,
      action === "select-row" ? "row" : "column",
      detail.rowIndex,
      detail.columnIndex,
    );
  }
  if (action === "open-cell-menu") return true;
  if (!("boundaryIndex" in detail)) return false;

  const { boundaryIndex } = detail;
  const { pos: tablePos, node: table } = tableInfo;
  const map = TableMap.get(table);
  const rect: TableRect = {
    map,
    table,
    tableStart: tablePos + 1,
    left: 0,
    top: 0,
    right: map.width,
    bottom: map.height,
  };
  let transaction = editor.state.tr;

  switch (action) {
    case "add-row-before": {
      if (boundaryIndex !== 0) return false;
      transaction = addRow(transaction, rect, 0);
      break;
    }
    case "add-row-after": {
      if (boundaryIndex < 1 || boundaryIndex > map.height) return false;
      transaction = addRow(transaction, rect, boundaryIndex);
      break;
    }
    case "add-column-before": {
      if (boundaryIndex !== 0) return false;
      transaction = addColumn(transaction, rect, 0);
      break;
    }
    case "add-column-after": {
      if (boundaryIndex < 1 || boundaryIndex > map.width) return false;
      transaction = addColumn(transaction, rect, boundaryIndex);
      break;
    }
    default:
      return false;
  }

  editor.view.dispatch(transaction);
  editor.commands.focus();
  return true;
}
