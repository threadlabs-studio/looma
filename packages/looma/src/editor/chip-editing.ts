import type { Editor } from "@tiptap/core";
import { normalizeLoomaChipColor, type LoomaChipColor } from "./extensions/chip";

/** The chip editor's state: whether it is open, and the label and tone of the chip it edits. */
export interface LoomaChipEditingState {
  readonly open: boolean;
  readonly label: string;
  readonly color: LoomaChipColor;
}

export const LOOMA_CHIP_EDITING_IDLE: LoomaChipEditingState = Object.freeze({ open: false, label: "", color: "neutral" });

/**
 * The chip editor as a state machine: it opens on one chip and writes each label and tone change to
 * that chip as the author makes it.
 *
 * @ownership The host owns presentation: the popover, its anchor, and focus. This owns which chip is
 * edited and the node attributes it writes.
 * @failure A change after the chip was deleted, or moved out of its node, closes the editor and writes
 * nothing.
 */
export interface LoomaChipEditing {
  readonly state: LoomaChipEditingState;
  /** The edited chip's element, for anchoring the editor, or null while it is closed. */
  readonly element: HTMLElement | null;
  /** Calls `listener` after every state change; returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /**
   * Opens on the chip at `position`.
   * @failure Returns false, and stays as it was, when the editor is read-only or no chip is there.
   */
  open(position: number): boolean;
  setLabel(label: string): void;
  setColor(color: LoomaChipColor): void;
  close(): void;
}

export interface LoomaChipEditingOptions {
  editor: Editor;
  /** Read on each opening, so a host can change it while the editor runs. */
  isEditable: () => boolean;
}

export function createChipEditing(options: LoomaChipEditingOptions): LoomaChipEditing {
  const { editor } = options;
  const listeners = new Set<() => void>();
  let state = LOOMA_CHIP_EDITING_IDLE;
  let element: HTMLElement | null = null;
  const set = (next: LoomaChipEditingState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };
  const close = () => {
    element = null;
    if (state.open) set({ ...state, open: false });
  };
  // The element follows the chip through edits around it, so its position is read again on each change.
  const change = (changes: Partial<Pick<LoomaChipEditingState, "label" | "color">>) => {
    if (!element || editor.isDestroyed || !element.isConnected) return close();
    const position = editor.view.posAtDOM(element, 0);
    const node = editor.state.doc.nodeAt(position);
    if (node?.type.name !== "loomaChip") return close();
    set({ ...state, ...changes });
    editor.view.dispatch(editor.state.tr.setNodeMarkup(position, undefined, { ...node.attrs, ...changes }));
  };

  return {
    get state() { return state; },
    get element() { return element; },
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    open(position) {
      if (!options.isEditable() || editor.isDestroyed) return false;
      const node = editor.state.doc.nodeAt(position);
      const dom = editor.view.nodeDOM(position);
      if (node?.type.name !== "loomaChip" || !(dom instanceof HTMLElement)) return false;
      element = dom;
      set({ open: true, label: String(node.attrs.label ?? ""), color: normalizeLoomaChipColor(node.attrs.color) });
      return true;
    },
    setLabel: (label) => change({ label }),
    setColor: (color) => change({ color }),
    close,
  };
}
