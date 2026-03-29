import type { Editor } from "@tiptap/core";
import TableCellBase from "@tiptap/extension-table-cell";
import TableHeaderBase from "@tiptap/extension-table-header";

export type TableCellAlignment = "left" | "center" | "right";

function normalizeTableCellAlignment(value: unknown): TableCellAlignment | null {
  if (value === "left" || value === "center" || value === "right") {
    return value;
  }
  return null;
}

const tableAlignmentAttributes = {
  textAlign: {
    default: null,
    parseHTML: (element: HTMLElement) =>
      normalizeTableCellAlignment(element.style.textAlign),
    renderHTML: (attributes: { textAlign?: unknown }) => {
      const textAlign = normalizeTableCellAlignment(attributes.textAlign);
      if (!textAlign || textAlign === "left") {
        return {};
      }
      return { style: `text-align: ${textAlign}` };
    },
  },
};

export const LoomaTableHeader = TableHeaderBase.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...tableAlignmentAttributes,
    };
  },
});

export const LoomaTableCell = TableCellBase.extend({
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
