import type { NodeViewRenderer } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { closeHistory } from "@tiptap/pm/history";
import { NodeSelection } from "@tiptap/pm/state";
import { componentRegistry } from "@nextwebwg/html-next/runtime";
import { createUiImage } from "@threadlabs/looma/vanilla/UiImage.js";
import { normalizeImagePlacement } from "../extensions/image";
import { createImageMedia, imageDeliveryAttributes } from "../image-media";
import { element } from "./element";

/**
 * Projects Image's resize into one document transaction, and draws the stored image with the
 * delivery attributes laid over it.
 * @ownership Delivery attributes belong to the inner `img`, never to Image; the stored attributes
 * stay independent of host renditions and drag previews.
 * @lifecycle Image disconnects once ProseMirror removes it; destroying the view stops following the
 * editor's editability.
 */
export const imageNodeView: NodeViewRenderer = ({ editor, node, getPos, decorations }) => {
  const inline = node.type.name === "loomaInlineImage";
  let current = node;
  let delivery = imageDeliveryAttributes(decorations);
  let selected = false;
  const media = createImageMedia();
  if (inline) media.dom.setAttribute("data-looma-inline-image", "");
  const props = (next: ProseMirrorNode) => ({
    src: (delivery.src as string | undefined) ?? next.attrs.src, alt: next.attrs.alt ?? "", width: next.attrs.width, height: next.attrs.height,
    placement: inline ? "inline" as const : normalizeImagePlacement(next.attrs.placement), selected: editor.isEditable && selected, resizable: editor.isEditable && !inline,
  });
  media.write(node.attrs, delivery);
  // The generated type knows Image's own resize event; the widened one is the root as the DOM sees it.
  const image = createUiImage({ ...props(node), attributes: { contenteditable: "false", "data-looma-image-node": "" }, slots: { media: [media.dom] } });
  const dom = element(image);
  // ProseMirror owns this element's lifetime, so the view sets its props as a framework adapter does.
  const render = () => {
    media.write(current.attrs, delivery);
    componentRegistry.update(dom, props(current));
  };
  dom.addEventListener("click", (event) => {
    if ((event.target as Element).closest("button")) return;
    const position = getPos();
    if (!editor.isEditable || typeof position !== "number") return;
    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, position)));
    editor.view.focus();
  });
  image.addEventListener("resize", (event) => {
    const { width, height, phase } = event.detail;
    if (event.target !== dom || phase !== "commit" || !editor.isEditable) return;
    const position = getPos();
    if (typeof position !== "number" || editor.state.doc.nodeAt(position) !== current) return;
    if (width === current.attrs.width && height === current.attrs.height) return;
    editor.view.dispatch(closeHistory(editor.state.tr).setNodeMarkup(position, undefined, { ...current.attrs, width, height }));
    editor.view.dispatch(closeHistory(editor.state.tr));
  });
  editor.on("update", render);
  return {
    dom,
    update(next, nextDecorations) {
      if (next.type !== current.type) return false;
      current = next;
      delivery = imageDeliveryAttributes(nextDecorations);
      render();
      return true;
    },
    selectNode() { selected = true; render(); },
    deselectNode() { selected = false; render(); },
    stopEvent: (event) => event.target instanceof Element && Boolean(event.target.closest("[data-corner]")),
    ignoreMutation: (mutation) => mutation.type !== "selection",
    destroy() { editor.off("update", render); },
  };
};
