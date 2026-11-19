import type { Editor } from "@tiptap/core";
import type { Node as EditorNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import type { SlashMenuAnchorRect } from "./slash-menu";
import { getVisualViewportRect, type ViewportRect } from "./viewport";

/** A text position paired with the document from which it was resolved. */
export interface EditorLineAnchor {
  readonly document: EditorNode;
  readonly position: number;
}

/** Chooses which edge at a wrap to measure and which scrolling box clips it. */
export interface EditorLineOptions {
  /** Use the preceding (-1) or following (1) text at a boundary. Defaults to following. */
  readonly side?: -1 | 1;
  /** A host scrollport whose client area should also clip the visual viewport. */
  readonly scrollport?: HTMLElement;
}

/** The client-space caret rectangle for a rendered line and its clipping state. */
export interface EditorLineGeometry {
  readonly rect: ViewportRect;
  readonly visible: boolean;
}

/**
 * Measures the rendered line at a tracked editor position without moving the selection.
 * @contract Visibility means the caret rectangle intersects the visual viewport and, when
 * supplied, the client area of an axis-aligned scrollport.
 * @failure Invalid, stale, unmounted, or composing editor positions return null.
 */
export function measureEditorLine(view: EditorView, anchor: EditorLineAnchor,
  { side = 1, scrollport }: EditorLineOptions = {}): EditorLineGeometry | null {
  if (view.isDestroyed || view.composing || !view.dom.isConnected || anchor.document !== view.state.doc) return null;
  const { document, position } = anchor;
  if (!Number.isSafeInteger(position) || position < 0 || position > document.content.size ||
      !document.resolve(position).parent.isTextblock) return null;

  const owner = view.dom.ownerDocument.defaultView;
  if (!owner || (scrollport && (!scrollport.isConnected || scrollport.ownerDocument !== view.dom.ownerDocument))) return null;
  const { left, right, top, bottom } = view.coordsAtPos(position, side);
  if (![left, right, top, bottom].every(Number.isFinite) || right < left || bottom <= top) return null;
  const rect = { left, right, top, bottom, width: right - left, height: bottom - top };
  const viewport = getVisualViewportRect(owner);
  let { left: clipLeft, right: clipRight, top: clipTop, bottom: clipBottom } = viewport;
  if (scrollport) {
    const bounds = scrollport.getBoundingClientRect();
    const scaleX = scrollport.offsetWidth ? bounds.width / scrollport.offsetWidth : 1;
    const scaleY = scrollport.offsetHeight ? bounds.height / scrollport.offsetHeight : 1;
    const portLeft = bounds.left + scrollport.clientLeft * scaleX;
    const portTop = bounds.top + scrollport.clientTop * scaleY;
    clipLeft = Math.max(clipLeft, portLeft);
    clipRight = Math.min(clipRight, portLeft + scrollport.clientWidth * scaleX);
    clipTop = Math.max(clipTop, portTop);
    clipBottom = Math.min(clipBottom, portTop + scrollport.clientHeight * scaleY);
  }
  const visible = clipLeft < clipRight && clipTop < clipBottom && top < clipBottom && bottom > clipTop &&
    left < clipRight && (left === right ? left >= clipLeft : right > clipLeft);
  return { rect, visible };
}

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
