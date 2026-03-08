/**
 * Looma list behavior extension:
 * - Enter in list/task items keeps the user in the list
 * - Backspace at start of an empty list/task item exits the list
 */

import { Extension, type Editor } from "@tiptap/core";

function isEmptyParagraphAtStart(editor: Editor): boolean {
  const { selection } = editor.state;
  return (
    selection.empty &&
    selection.$from.parent.isTextblock &&
    selection.$from.parent.content.size === 0 &&
    selection.$from.parentOffset === 0
  );
}

export const LoomaListBehavior = Extension.create({
  name: "loomaListBehavior",

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        if (this.editor.isActive("taskItem")) {
          return this.editor.commands.splitListItem("taskItem");
        }
        if (this.editor.isActive("listItem")) {
          return this.editor.commands.splitListItem("listItem");
        }
        return false;
      },

      Backspace: () => {
        if (!isEmptyParagraphAtStart(this.editor)) {
          return false;
        }
        if (this.editor.isActive("taskItem")) {
          return this.editor.commands.liftListItem("taskItem");
        }
        if (this.editor.isActive("listItem")) {
          return this.editor.commands.liftListItem("listItem");
        }
        return false;
      },
    };
  },
});
