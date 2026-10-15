import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

/**
 * Applies a block menu action to the top-level block holding the caret, then focuses the editor:
 * insert a paragraph below, duplicate the block, or delete it. Deleting the only block leaves an
 * empty paragraph.
 *
 * @failure Returns false, and changes nothing, for an unknown action or a caret outside any block.
 */
export function runBlockAction(editor: Editor, action: string): boolean {
  const head = editor.state.selection.$head;
  if (head.depth === 0) return false;
  const { state } = editor;
  const position = head.before(1);
  const block = state.doc.nodeAt(position);
  if (!block) return false;
  const end = position + block.nodeSize;
  const transaction = state.tr;
  let focusAt = end + 1;
  if (action === "insert-below") {
    transaction.insert(end, state.schema.nodes.paragraph.create());
  } else if (action === "duplicate") {
    transaction.insert(end, block);
  } else if (action === "delete") {
    if (state.doc.childCount === 1) {
      transaction.replaceWith(position, end, state.schema.nodes.paragraph.create());
      focusAt = 1;
    } else {
      transaction.delete(position, end);
      focusAt = Math.min(position + 1, transaction.doc.content.size);
    }
  } else return false;
  transaction.setSelection(TextSelection.near(transaction.doc.resolve(Math.min(focusAt, transaction.doc.content.size))));
  editor.view.dispatch(transaction);
  editor.commands.focus();
  return true;
}
