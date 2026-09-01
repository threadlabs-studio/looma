/**
 * Table overlay action handler — maps boundaryIndex to Tiptap table commands.
 * Use with looma-editor-table-overlay-action: call this from the adapter's handler.
 */

import type { Editor, Range } from "@tiptap/core";
import { TableMap } from "prosemirror-tables";
import type { TableOverlayActionEventDetail } from "../table-overlay";

interface TableNode {
  child: (i: number) => { nodeSize: number; child: (j: number) => { nodeSize: number }; childCount: number };
  childCount: number;
}

export interface InsertTableAtRangeOptions {
  rows?: number;
  cols?: number;
  withHeaderRow?: boolean;
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
 * Returns a valid text-selection position inside the first paragraph of a cell.
 * Assumes no colSpan/rowSpan for simplicity.
 */
function getTextPositionInCell(
  tablePos: number,
  table: TableNode,
  rowIndex: number,
  colIndex: number
): number {
  let pos = tablePos + 1;
  for (let r = 0; r < rowIndex; r++) {
    pos += table.child(r).nodeSize;
  }
  const row = table.child(rowIndex);
  for (let c = 0; c < colIndex; c++) {
    pos += row.child(c).nodeSize;
  }
  // `pos` is inside the table before the row. Cross the row, cell, and
  // paragraph boundaries so TextSelection never lands on a tableRow.
  return pos + 3;
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

  const { action, boundaryIndex } = detail;
  const { pos: tablePos, node: table } = tableInfo;
  const rows = table.childCount;
  const cols = rows > 0 ? (table.child(0) as { childCount: number }).childCount : 0;

  let cellPos: number;
  let command: () => boolean;

  switch (action) {
    case "add-row-before": {
      const rowIndex = Math.min(boundaryIndex, rows - 1);
      if (rowIndex < 0) return false;
      cellPos = getTextPositionInCell(tablePos, table as TableNode, rowIndex, 0);
      command = () => editor.chain().focus().setTextSelection(cellPos).addRowBefore().run();
      break;
    }
    case "add-row-after": {
      const rowIndex = Math.min(boundaryIndex, rows - 1);
      if (rowIndex < 0) return false;
      cellPos = getTextPositionInCell(tablePos, table as TableNode, rowIndex, 0);
      command = () => editor.chain().focus().setTextSelection(cellPos).addRowAfter().run();
      break;
    }
    case "add-column-before": {
      const colIndex = Math.min(boundaryIndex, cols - 1);
      if (colIndex < 0) return false;
      cellPos = getTextPositionInCell(tablePos, table as TableNode, 0, colIndex);
      command = () => editor.chain().focus().setTextSelection(cellPos).addColumnBefore().run();
      break;
    }
    case "add-column-after": {
      const colIndex = Math.min(boundaryIndex, cols - 1);
      if (colIndex < 0) return false;
      cellPos = getTextPositionInCell(tablePos, table as TableNode, 0, colIndex);
      command = () => editor.chain().focus().setTextSelection(cellPos).addColumnAfter().run();
      break;
    }
    default:
      return false;
  }

  return command();
}
