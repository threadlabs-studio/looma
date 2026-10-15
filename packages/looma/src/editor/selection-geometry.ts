import type { Editor } from "@tiptap/core";
import type { SlashMenuAnchorRect } from "./slash-menu";

/** A plain copy of a client rectangle, the anchor shape the slash and mention menus accept as a prop. */
export function menuAnchorRect(rect: DOMRect | null): SlashMenuAnchorRect | null {
  if (!rect) return null;
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

function selectionElement(editor: Editor): Element | null {
  const { node } = editor.view.domAtPos(editor.state.selection.from);
  return node instanceof HTMLElement ? node : node.parentElement;
}

/** The rendered table that holds the selection's start. */
export function selectedTableElement(editor: Editor): HTMLTableElement | null {
  return selectionElement(editor)?.closest("table") as HTMLTableElement | null;
}

/** The rendered cell that holds the selection's start. */
export function selectedTableCellElement(editor: Editor): HTMLTableCellElement | null {
  return selectionElement(editor)?.closest("td, th") as HTMLTableCellElement | null;
}
