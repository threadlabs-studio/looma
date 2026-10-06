import { Extension } from "@tiptap/core";
import { NodeSelection, Plugin, TextSelection } from "@tiptap/pm/state";

/** Selects atomic visual blocks by pointer and keeps text Tab input in the document.
 * @contract List and table keymaps run first; Shift-Tab outside a list remains
 * browser navigation so keyboard users can leave the editing surface.
 */
export const LoomaBlockSelection = Extension.create({
  name: "loomaBlockSelection",
  priority: 50,
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        const editor = this.editor;
        if (!editor.isEditable || !(editor.state.selection instanceof TextSelection)) return false;
        if (editor.isActive("table")) return false;
        if (editor.isActive("listItem") || editor.isActive("taskItem")) return true;
        return editor.commands.insertContent("\t");
      },
    };
  },
  addProseMirrorPlugins() {
    return [new Plugin({
      props: {
        handleClickOn: (view, _position, node, nodePosition, _event, direct) => {
          if (!view.editable || !direct || !["image", "horizontalRule"].includes(node.type.name)) return false;
          view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePosition)));
          view.focus();
          return true;
        },
      },
    })];
  },
});
