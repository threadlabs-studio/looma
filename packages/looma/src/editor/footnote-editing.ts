import type { AnyExtension, Editor, JSONContent } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { findLoomaFootnote } from "./extensions/footnote";

/** The floating editor's structured note content; numbering belongs to the document. */
export interface LoomaFootnoteEditingState {
  readonly open: boolean;
  readonly note: JSONContent;
}

const content = (note: ProseMirrorNode): JSONContent => ({ type: "doc", content: note.content.toJSON() });
export const LOOMA_FOOTNOTE_EDITING_IDLE: LoomaFootnoteEditingState = Object.freeze({ open: false, note: { type: "doc", content: [{ type: "paragraph" }] } });

/**
 * Edits one note without exposing its internal Markdown identity to the writer.
 * @ownership The host owns action bar, popover, anchor and focus; this owns document updates.
 * @failure Deleting the reference closes the editor. Invalid structured content never replaces a note.
 */
export interface LoomaFootnoteEditing {
  readonly state: LoomaFootnoteEditingState;
  /** The reference used to anchor the floating actions or editor. */
  readonly element: HTMLElement | null;
  subscribe(listener: () => void): () => void;
  /** Opens on an editable footnote reference; returns false when the reference or note is absent. */
  open(position: number): boolean;
  /** Replaces note content using the parent schema, preserving blocks, marks and attributes. */
  setNote(note: JSONContent): void;
  /** Closes the floating surface and moves the document caret to the note. */
  goToNote(): void;
  close(): void;
}

export interface LoomaFootnoteEditingOptions {
  editor: Editor;
  isEditable: () => boolean;
}

/**
 * Reuses the parent content schema in a short-form field, including global attributes.
 * Document-wide normalizers and node-view callbacks stay with the parent editor.
 */
export function footnoteContentExtensions(editor: Editor): AnyExtension[] {
  return editor.extensionManager.extensions
    .filter(extension => extension.type === "node" || extension.type === "mark")
    .filter(extension => extension.name !== "loomaFootnote")
    .map(extension => {
      const attributes = Object.fromEntries(editor.extensionManager.attributes
        .filter(attribute => attribute.type === extension.name)
        .map(attribute => [attribute.name, { ...attribute.attribute }]));
      const schema = { addAttributes: () => attributes, addGlobalAttributes: () => [], addProseMirrorPlugins: () => [] };
      return extension.type === "node" ? extension.extend({ ...schema, addNodeView: null }) : extension.extend(schema);
    });
}

export function createFootnoteEditing(options: LoomaFootnoteEditingOptions): LoomaFootnoteEditing {
  const { editor } = options;
  const listeners = new Set<() => void>();
  let state = LOOMA_FOOTNOTE_EDITING_IDLE;
  let element: HTMLElement | null = null;
  let identity = "";
  const set = (next: LoomaFootnoteEditingState) => {
    state = next;
    listeners.forEach(listener => listener());
  };
  const close = () => {
    element = null;
    identity = "";
    if (state.open) set({ ...state, open: false });
  };
  const note = () => state.open && !editor.isDestroyed && element?.isConnected ? findLoomaFootnote(editor.state.doc, identity) : null;
  const sync = () => {
    if (!state.open) return;
    const found = note();
    if (!found) return close();
    const next = content(found.node);
    if (JSON.stringify(next) !== JSON.stringify(state.note)) set({ ...state, note: next });
  };
  const destroy = () => {
    close();
    editor.off("transaction", sync);
    editor.off("destroy", destroy);
    listeners.clear();
  };
  editor.on("transaction", sync);
  editor.on("destroy", destroy);

  return {
    get state() { return state; },
    get element() { return element; },
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    open(position) {
      if (!options.isEditable() || editor.isDestroyed) return false;
      const node = editor.state.doc.nodeAt(position), dom = editor.view.nodeDOM(position);
      if (node?.type.name !== "loomaFootnoteReference" || !(dom instanceof HTMLElement)) return false;
      const found = findLoomaFootnote(editor.state.doc, String(node.attrs.label));
      if (!found) return false;
      identity = String(node.attrs.label);
      element = dom;
      set({ open: true, note: content(found.node) });
      return true;
    },
    setNote(value) {
      const found = note();
      if (!found) return close();
      const next = editor.schema.nodeFromJSON(value);
      if (next.type !== editor.schema.topNodeType || !found.node.type.validContent(next.content)) throw new Error("Invalid footnote content.");
      if (found.node.content.eq(next.content)) return;
      editor.view.dispatch(editor.state.tr.replaceWith(found.position + 1, found.position + 1 + found.node.content.size, next.content));
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
