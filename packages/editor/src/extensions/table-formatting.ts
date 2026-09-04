import type { AnyExtension, Editor } from "@tiptap/core";
import TableBase from "@tiptap/extension-table";
import TableCellBase from "@tiptap/extension-table-cell";
import TableHeaderBase from "@tiptap/extension-table-header";
export { TABLE_CELL_BACKGROUND_PRESETS } from "../table-backgrounds";

export type TableCellAlignment = "left" | "center" | "right";
export type TableCellBackground = string | null;

export const LoomaTable: AnyExtension = TableBase.configure({
  resizable: true,
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

export const LoomaTableHeader: AnyExtension = TableHeaderBase.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...tableAlignmentAttributes,
    };
  },
});

export const LoomaTableCell: AnyExtension = TableCellBase.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...tableAlignmentAttributes,
    };
  },
});

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
