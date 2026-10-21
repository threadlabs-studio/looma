import type { Editor } from "@tiptap/core";
import { Fragment, type Node as ProseMirrorNode } from "@tiptap/pm/model";
import { findLoomaFootnote, LOOMA_FOOTNOTE_LABEL } from "./extensions/footnote";

/** The footnote editor's state: the edited reference's label and its note's text. */
export interface LoomaFootnoteEditingState {
  readonly open: boolean;
  readonly label: string;
  /** The note's text, its blocks on separate lines. */
  readonly note: string;
  /** Whether `note` can be edited as text: the note is one paragraph of unformatted text. */
  readonly editable: boolean;
  /** Why the last label offered was not used, or empty. */
  readonly error: string;
}

export const LOOMA_FOOTNOTE_EDITING_IDLE: LoomaFootnoteEditingState = Object.freeze({ open: false, label: "", note: "", editable: false, error: "" });

/**
 * The footnote editor as a state machine: it opens on one reference, writes the note's text as the
 * author types it, and renames the footnote everywhere when a new label is committed.
 *
 * @ownership The host owns presentation: the popover, its anchor, and focus. This owns which footnote
 * is edited and the document changes it makes.
 * @failure A change after the footnote was deleted closes the editor and writes nothing. A label with
 * a space or `]`, or one another footnote uses, is not applied; `error` says why.
 */
export interface LoomaFootnoteEditing {
  readonly state: LoomaFootnoteEditingState;
  /** The edited reference's element, for anchoring the editor, or null while it is closed. */
  readonly element: HTMLElement | null;
  /** Calls `listener` after every state change; returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /**
   * Opens on the reference at `position`.
   * @failure Returns false, and stays as it was, when the editor is read-only or no reference is there.
   */
  open(position: number): boolean;
  /** Replaces the note's text; ignored unless `state.editable`. */
  setNote(note: string): void;
  rename(label: string): void;
  /** Closes the editor and moves the caret to the end of the note. */
  goToNote(): void;
  close(): void;
}

export interface LoomaFootnoteEditingOptions {
  editor: Editor;
  /** Read on each opening, so a host can change it while the editor runs. */
  isEditable: () => boolean;
}

const plain = (note: ProseMirrorNode) => {
  const paragraph = note.firstChild;
  if (note.childCount !== 1 || paragraph?.type.name !== "paragraph") return false;
  let text = true;
  paragraph.forEach(child => { if (!child.isText || child.marks.length) text = false; });
  return text;
};

export function createFootnoteEditing(options: LoomaFootnoteEditingOptions): LoomaFootnoteEditing {
  const { editor } = options;
  const listeners = new Set<() => void>();
  let state = LOOMA_FOOTNOTE_EDITING_IDLE;
  let element: HTMLElement | null = null;
  const set = (next: LoomaFootnoteEditingState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };
  const close = () => {
    element = null;
    if (state.open) set({ ...state, open: false });
  };
  // The note is found by label on each change, so edits elsewhere in the document cannot misdirect one.
  const note = () => (state.open && !editor.isDestroyed && element?.isConnected ? findLoomaFootnote(editor.state.doc, state.label) : null);

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
      if (node?.type.name !== "loomaFootnoteReference" || !(dom instanceof HTMLElement)) return false;
      const label = String(node.attrs.label);
      const found = findLoomaFootnote(editor.state.doc, label);
      if (!found) return false;
      element = dom;
      set({ open: true, label, note: found.node.textBetween(0, found.node.content.size, "\n"), editable: plain(found.node), error: "" });
      return true;
    },
    setNote(text) {
      const found = note();
      if (!found) return close();
      if (!state.editable) return;
      // A note edited here is one paragraph; a line break typed into the field joins its lines.
      const value = text.replace(/\s*\n\s*/g, " ");
      const start = found.position + 2;
      const end = start + found.node.firstChild!.content.size;
      editor.view.dispatch(editor.state.tr.replaceWith(start, end, value ? editor.schema.text(value) : Fragment.empty));
      set({ ...state, note: value });
    },
    rename(label) {
      if (!note()) return close();
      if (label === state.label) return state.error ? set({ ...state, error: "" }) : undefined;
      if (!LOOMA_FOOTNOTE_LABEL.test(label)) return set({ ...state, error: "A label is one word, without ]." });
      if (!editor.commands.renameLoomaFootnote(state.label, label)) return set({ ...state, error: "Another footnote uses this label." });
      set({ ...state, label, error: "" });
    },
    goToNote() {
      const reference = element;
      close();
      if (!reference?.isConnected || editor.isDestroyed) return;
      editor.chain().focus().setNodeSelection(editor.view.posAtDOM(reference, 0)).goToLoomaFootnote().run();
    },
    close,
  };
}
