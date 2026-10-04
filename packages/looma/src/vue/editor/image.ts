import type { NodeViewRenderer } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";
import { NodeSelection } from "@tiptap/pm/state";
import { createApp, h, ref, shallowRef } from "vue";
import { Image } from "@threadlabs/looma/vue";
import { normalizeImagePlacement } from "../../editor/extensions/image";

/** Projects the shared image's resize intent into a single document transaction.
 * @ownership Delivery decorations belong to the inner image, never the figure;
 * persisted attributes remain independent of host renditions and drag previews.
 * @lifecycle Each atom owns a Vue app and an editability subscription.
 */
export const imageNodeView: NodeViewRenderer = ({ editor, node, getPos, decorations }) => {
  const mount = document.createElement("div");
  const current = shallowRef(node);
  const delivery = shallowRef(decorations);
  const selected = ref(false);
  const editable = ref(editor.isEditable);
  const refresh = () => { editable.value = editor.isEditable; };
  const app = createApp({ render: () => {
    const attrs = current.value.attrs;
    const transient = Object.assign({}, ...delivery.value.map(decoration => decoration.spec.loomaImageAttributes ?? {}));
    return h(Image, {
      src: attrs.src, alt: attrs.alt ?? "", width: attrs.width, height: attrs.height,
      placement: normalizeImagePlacement(attrs.placement), selected: editable.value && selected.value,
      resizable: editable.value, contenteditable: "false", "data-looma-image-node": "",
      onClick: (event: MouseEvent) => {
        if ((event.target as Element).closest("button")) return;
        const position = getPos();
        if (!editor.isEditable || typeof position !== "number") return;
        editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, position)));
        editor.view.focus();
      },
      onResize: (event: CustomEvent<{ width: number; height: number; phase: string }>) => {
        if (event.detail.phase !== "commit" || !editor.isEditable) return;
        const position = getPos();
        if (typeof position !== "number" || editor.state.doc.nodeAt(position) !== current.value) return;
        const { width, height } = event.detail;
        if (width === current.value.attrs.width && height === current.value.attrs.height) return;
        editor.view.dispatch(closeHistory(editor.state.tr).setNodeMarkup(position, undefined, { ...current.value.attrs, width, height }));
        editor.view.dispatch(closeHistory(editor.state.tr));
      },
    }, { media: () => h("img", {
      src: attrs.src, alt: attrs.alt ?? "", title: attrs.title, width: attrs.width, height: attrs.height,
      ...transient,
    }) });
  } });
  app.mount(mount);
  const dom = mount.firstElementChild as HTMLElement;
  editor.on("update", refresh);
  return {
    dom,
    update(next, nextDecorations) {
      if (next.type !== current.value.type) return false;
      current.value = next; delivery.value = nextDecorations; refresh(); return true;
    },
    selectNode() { selected.value = true; },
    deselectNode() { selected.value = false; },
    stopEvent: event => event.target instanceof Element && Boolean(event.target.closest("[data-corner]")),
    ignoreMutation: mutation => mutation.type !== "selection",
    destroy() { editor.off("update", refresh); app.unmount(); },
  };
};
