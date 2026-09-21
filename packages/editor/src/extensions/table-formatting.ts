import type { AnyExtension, Editor } from "@tiptap/core";
import TableBase from "@tiptap/extension-table";
import TableCellBase from "@tiptap/extension-table-cell";
import TableHeaderBase from "@tiptap/extension-table-header";
export { TABLE_CELL_BACKGROUND_PRESETS } from "../table-backgrounds";

/** Persistable horizontal alignments accepted by Looma table cells. */
export type TableCellAlignment = "left" | "center" | "right";
/** CSS color stored in document attrs; null removes authored cell background. */
export type TableCellBackground = string | null;

/**
 * Looma's table behavior policy: resizable columns, stable minimum cell width,
 * and no independently resizable trailing column. The narrow handle is also a
 * Tiptap coordinate probe, so changing it affects selection as well as visuals.
 *
 * @invariant The 3px handle, 112px cell minimum, and fixed trailing edge are a
 * coordinated selection-and-resize policy and must be changed together.
 */
export const LoomaTable: AnyExtension = TableBase.configure({
  resizable: true,
  // Tiptap also uses this as its inward coordinate probe. The 5px default can
  // resolve to the row around an empty minimum-width cell instead of the cell.
  handleWidth: 3,
  cellMinWidth: 112,
  lastColumnResizable: false,
});

function normalizeTableCellAlignment(value: unknown): TableCellAlignment | null {
  if (value === "left" || value === "center" || value === "right") {
    return value;
  }
  return null;
}

function normalizeTableCellBackground(value: unknown): TableCellBackground {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function renderTableCellStyle(attributes: {
  textAlign?: unknown;
  backgroundColor?: unknown;
}): string | null {
  const styleFragments: string[] = [];
  const textAlign = normalizeTableCellAlignment(attributes.textAlign);
  const backgroundColor = normalizeTableCellBackground(attributes.backgroundColor);

  if (textAlign && textAlign !== "left") {
    styleFragments.push(`text-align: ${textAlign}`);
  }

  if (backgroundColor) {
    styleFragments.push(`background-color: ${backgroundColor}`);
  }

  return styleFragments.length > 0 ? `${styleFragments.join("; ")};` : null;
}

const tableAlignmentAttributes = {
  textAlign: {
    default: null,
    parseHTML: (element: HTMLElement) =>
      normalizeTableCellAlignment(element.style.textAlign),
    renderHTML: (attributes: { textAlign?: unknown; backgroundColor?: unknown }) => {
      const style = renderTableCellStyle(attributes);
      return style ? { style } : {};
    },
  },
  backgroundColor: {
    default: null,
    parseHTML: (element: HTMLElement) =>
      normalizeTableCellBackground(element.style.backgroundColor),
    renderHTML: (attributes: { textAlign?: unknown; backgroundColor?: unknown }) => {
      const style = renderTableCellStyle(attributes);
      return style ? { style } : {};
    },
  },
};

/**
 * Header node that round-trips Looma alignment and background attributes.
 *
 * @contract Inherits the base header schema while normalizing authored styles
 * into the same persisted attributes used by body cells.
 */
export const LoomaTableHeader: AnyExtension = TableHeaderBase.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...tableAlignmentAttributes,
    };
  },
});

/**
 * Body-cell node with the same persisted formatting contract as headers.
 *
 * @contract Inherits the base cell schema and shares header parsing/rendering so
 * moving content between header and body cells does not change formatting data.
 */
export const LoomaTableCell: AnyExtension = TableCellBase.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...tableAlignmentAttributes,
    };
  },
});

/**
 * Reads formatting from the nearest cell/header ancestor of the selection.
 * Left is the canonical default and is not serialized as an inline style.
 *
 * @contract Returns `left` outside a table cell and for missing, invalid, or
 * explicitly default alignment attributes.
 */
export function getActiveTableCellAlignment(editor: Editor): TableCellAlignment {
  const { $from } = editor.state.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
      return normalizeTableCellAlignment(node.attrs.textAlign) ?? "left";
    }
  }

  return "left";
}

/**
 * Returns the nearest cell/header background, normalized so blank means absent.
 *
 * @contract Returns null outside a table cell and for non-string or whitespace-
 * only attributes, matching the value used to clear persisted background CSS.
 */
export function getActiveTableCellBackground(editor: Editor): TableCellBackground {
  const { $from } = editor.state.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
      return normalizeTableCellBackground(node.attrs.backgroundColor);
    }
  }

  return null;
}

/**
 * Updates the active header or body cell and returns false outside a table cell.
 * Setting left stores null, keeping the document free of redundant default CSS.
 *
 * @contract Focuses and updates only the active header or body cell; unsupported
 * selections return false without creating a transaction.
 */
export function setActiveTableCellAlignment(
  editor: Editor,
  alignment: TableCellAlignment
): boolean {
  const textAlign = alignment === "left" ? null : alignment;

  if (editor.isActive("tableHeader")) {
    return editor.chain().focus().updateAttributes("tableHeader", { textAlign }).run();
  }

  if (editor.isActive("tableCell")) {
    return editor.chain().focus().updateAttributes("tableCell", { textAlign }).run();
  }

  return false;
}

/**
 * Updates the active header or body cell; blank strings normalize to null so
 * clearing formatting removes persisted inline style instead of storing noise.
 *
 * @contract Focuses and updates only the active header or body cell; unsupported
 * selections return false and blank values remove the persisted attribute.
 */
export function setActiveTableCellBackground(
  editor: Editor,
  backgroundColor: TableCellBackground
): boolean {
  const normalizedBackgroundColor = normalizeTableCellBackground(backgroundColor);

  if (editor.isActive("tableHeader")) {
    return editor.chain().focus().updateAttributes("tableHeader", {
      backgroundColor: normalizedBackgroundColor,
    }).run();
  }

  if (editor.isActive("tableCell")) {
    return editor.chain().focus().updateAttributes("tableCell", {
      backgroundColor: normalizedBackgroundColor,
    }).run();
  }

  return false;
}
