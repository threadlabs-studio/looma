import { Editor, type EditorOptions, type JSONContent } from "@tiptap/core";
import { TextSelection, type Selection, type SelectionBookmark } from "@tiptap/pm/state";
import { sameDocument } from "./content";

/** A selection remembered so a controlled document replacement can put it back. */
export interface LoomaSelectionSnapshot {
  bookmark: SelectionBookmark;
  from: number;
  to: number;
  text: boolean;
}

export function selectionSnapshot(selection: Selection): LoomaSelectionSnapshot {
  return { bookmark: selection.getBookmark(), from: selection.from, to: selection.to, text: selection instanceof TextSelection };
}

/**
 * One editor's Tiptap instance, independent of any component framework.
 *
 * @ownership The session owns the `Editor` from creation until `destroy()`. A host renders an
 * element for the document and hands it to `attach()`; it never creates or destroys the editor.
 * @lifecycle The editor, its document, and its undo history survive `attach()` to a new element,
 * so a host can remount its view without losing state.
 */
export interface LoomaEditorSession<E extends Editor = Editor> {
  readonly editor: E;
  /** Moves the editor's view into `element` (idempotent). */
  attach(element: HTMLElement): void;
  /**
   * Applies a controlled document.
   *
   * @contract Returns false, and leaves the editor untouched, when the document already matches.
   * A focused editor keeps `selection` (or its current selection) in the same transaction.
   * @failure A selection the new document cannot hold becomes the closest valid text range.
   */
  setContent(content: JSONContent, selection?: LoomaSelectionSnapshot | null): boolean;
  /** Calls `listener` after every transaction; returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
  destroy(): void;
}

/**
 * Creates the session's editor from `options`. A framework layer may pass its own `Editor`
 * subclass, such as `@tiptap/vue-3`'s reactive one, so the editor it exposes keeps that behavior.
 */
export function createEditorSession<E extends Editor = Editor>(
  options: Partial<EditorOptions>,
  EditorClass: new (options: Partial<EditorOptions>) => E = Editor as unknown as new (options: Partial<EditorOptions>) => E,
): LoomaEditorSession<E> {
  const editor = new EditorClass(options);
  return {
    editor,
    attach(element) {
      const current = editor.options.element;
      if (editor.isDestroyed || current === element || !current.firstChild) return;
      element.append(...current.childNodes);
      editor.setOptions({ element });
      editor.createNodeViews();
    },
    setContent(content, selection) {
      if (editor.isDestroyed || sameDocument(editor.getJSON(), content)) return false;
      const previous = selection ?? selectionSnapshot(editor.view.state.selection);
      if (!editor.isFocused) {
        editor.commands.setContent(content, false);
        return true;
      }
      // Set the document and restored selection in one transaction. A separate
      // selection transaction is too late: replacing the document maps the DOM
      // caret to the end before ProseMirror reconciles focus.
      editor.chain().setContent(content, false).command(({ tr }) => {
        try {
          tr.setSelection(previous.text
            ? TextSelection.between(tr.doc.resolve(previous.from), tr.doc.resolve(previous.to))
            : previous.bookmark.resolve(tr.doc));
        } catch {
          // A genuine remote replacement can make the old selection invalid.
          // Preserve the closest valid text range instead of Tiptap's default
          // behavior of moving the caret to the document end.
          const max = tr.doc.content.size;
          const from = Math.max(0, Math.min(previous.from, max));
          const to = Math.max(from, Math.min(previous.to, max));
          tr.setSelection(TextSelection.between(tr.doc.resolve(from), tr.doc.resolve(to)));
        }
        return true;
      }).run();
      editor.view.focus();
      return true;
    },
    subscribe(listener) {
      editor.on("transaction", listener);
      return () => { editor.off("transaction", listener); };
    },
    destroy() {
      editor.destroy();
    },
  };
}
