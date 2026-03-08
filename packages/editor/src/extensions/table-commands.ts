/**
 * Table overlay action handler — maps boundaryIndex to Tiptap table commands.
 * Use with looma-editor-table-overlay-action: call this from the adapter's handler.
 */

import type { Editor } from "@tiptap/core";
import type { TableOverlayActionEventDetail } from "../table-overlay";

interface TableNode {
  child: (i: number) => { nodeSize: number; child: (j: number) => { nodeSize: number }; childCount: number };
  childCount: number;
}

/**
 * Returns the position of the first cell in the given row of a ProseMirror table.
 * Assumes no colSpan/rowSpan for simplicity.
 */
function getCellPosInTable(
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
  return pos + 1;
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
      cellPos = getCellPosInTable(tablePos, table as TableNode, rowIndex, 0);
      command = () => editor.chain().focus().setTextSelection(cellPos).addRowBefore().run();
      break;
    }
    case "add-row-after": {
      const rowIndex = Math.min(boundaryIndex, rows - 1);
      if (rowIndex < 0) return false;
      cellPos = getCellPosInTable(tablePos, table as TableNode, rowIndex, 0);
      command = () => editor.chain().focus().setTextSelection(cellPos).addRowAfter().run();
      break;
    }
    case "add-column-before": {
      const colIndex = Math.min(boundaryIndex, cols - 1);
      if (colIndex < 0) return false;
      cellPos = getCellPosInTable(tablePos, table as TableNode, 0, colIndex);
      command = () => editor.chain().focus().setTextSelection(cellPos).addColumnBefore().run();
      break;
    }
    case "add-column-after": {
      const colIndex = Math.min(boundaryIndex, cols - 1);
      if (colIndex < 0) return false;
      cellPos = getCellPosInTable(tablePos, table as TableNode, 0, colIndex);
      command = () => editor.chain().focus().setTextSelection(cellPos).addColumnAfter().run();
      break;
    }
    default:
      return false;
  }

  return command();
}
