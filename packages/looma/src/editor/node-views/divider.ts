import type { NodeViewRenderer } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { componentRegistry } from "@nextwebwg/html-next/runtime";
import { createUiSeparator } from "@threadlabs/looma/vanilla/UiSeparator.js";

/**
 * A pointer-sized document divider drawn by Separator, selectable while the editor is editable.
 * @lifecycle The editor owns the node and its deletion. Separator connects while ProseMirror keeps its
 * element in the document and disconnects once ProseMirror removes it; destroying the view stops
 * following the editor's editability.
 */
export const dividerNodeView: NodeViewRenderer = ({ editor, getPos }) => {
  let selected = false;
  // The root is a plain element to ProseMirror; its native events are the ones the view listens to.
  const dom: HTMLElement = createUiSeparator({ selectable: editor.isEditable, attributes: { contenteditable: "false" } });
  // ProseMirror owns this element's lifetime, so the node view sets its props as a framework adapter does.
  const render = () => componentRegistry.update(dom, { selectable: editor.isEditable, selected: editor.isEditable && selected });
  dom.addEventListener("click", () => {
    const position = getPos();
    if (!editor.isEditable || typeof position !== "number") return;
    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, position)));
    editor.view.focus();
  });
  editor.on("update", render);
  return {
    dom,
    selectNode() { selected = true; render(); },
    deselectNode() { selected = false; render(); },
    stopEvent: () => false,
    ignoreMutation: (mutation) => mutation.type !== "selection",
    destroy() { editor.off("update", render); },
  };
};
