import type { NodeViewRenderer } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { createApp, h, ref } from "vue";
import { Separator } from "@threadlabs/looma/vue";

/** A pointer-sized document divider using the shared separator's selected state.
 * @lifecycle The editor owns the node and deletion; destroying the view releases
 * its Vue app and editability subscription.
 */
export const dividerNodeView: NodeViewRenderer = ({ editor, getPos }) => {
  const mount = document.createElement("div");
  const selected = ref(false);
  const editable = ref(editor.isEditable);
  const refresh = () => { editable.value = editor.isEditable; };
  const app = createApp({ render: () => h(Separator, {
    selectable: editable.value, selected: editable.value && selected.value,
    contenteditable: "false",
    onClick: () => {
      const position = getPos();
      if (!editor.isEditable || typeof position !== "number") return;
      editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, position)));
      editor.view.focus();
    },
  }) });
  app.mount(mount);
  const dom = mount.firstElementChild as HTMLElement;
  editor.on("update", refresh);
  return {
    dom,
    selectNode() { selected.value = true; },
    deselectNode() { selected.value = false; },
    stopEvent: () => false,
    ignoreMutation: mutation => mutation.type !== "selection",
    destroy() { editor.off("update", refresh); app.unmount(); },
  };
};
