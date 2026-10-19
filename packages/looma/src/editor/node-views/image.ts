import type { NodeViewRenderer } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Decoration } from "@tiptap/pm/view";
import { closeHistory } from "@tiptap/pm/history";
import { NodeSelection } from "@tiptap/pm/state";
import { componentRegistry } from "@nextwebwg/html-next/runtime";
import { createUiImage } from "@threadlabs/looma/vanilla/UiImage.js";
import { normalizeImagePlacement } from "../extensions/image";
import { element } from "./element";

type Attributes = Record<string, unknown>;

/** The delivery attributes the editor's decorations lay over the stored ones, such as `srcset`. */
const deliveryAttributes = (decorations: readonly Decoration[]): Attributes =>
  Object.assign({}, ...decorations.map((decoration) => (decoration.spec as { loomaImageAttributes?: Attributes }).loomaImageAttributes ?? {}));

/**
 * Projects Image's resize into one document transaction, and draws the stored image with the
 * delivery attributes laid over it.
 * @ownership Delivery attributes belong to the inner `img`, never to Image; the stored attributes
 * stay independent of host renditions and drag previews.
 * @lifecycle Image disconnects once ProseMirror removes it; destroying the view stops following the
 * editor's editability.
 */
export const imageNodeView: NodeViewRenderer = ({ editor, node, getPos, decorations }) => {
  let current = node;
  let delivery = deliveryAttributes(decorations);
  let selected = false;
  const media = document.createElement("img");
  let written = new Set<string>();
  // The img carries the stored attributes with delivery's on top; an attribute delivery drops is removed.
  const writeMedia = (attrs: Attributes) => {
    const next = Object.entries({ src: attrs.src, alt: attrs.alt ?? "", title: attrs.title, width: attrs.width, height: attrs.height, ...delivery })
      .filter(([, value]) => value !== undefined && value !== null && value !== false);
    const names = new Set(next.map(([name]) => name));
    for (const name of written) if (!names.has(name)) media.removeAttribute(name);
    for (const [name, value] of next) {
      const text = value === true ? "" : String(value);
      if (media.getAttribute(name) !== text) media.setAttribute(name, text);
    }
    written = names;
  };
  const props = (next: ProseMirrorNode) => ({
    src: (delivery.src as string | undefined) ?? next.attrs.src, alt: next.attrs.alt ?? "", width: next.attrs.width, height: next.attrs.height,
    placement: normalizeImagePlacement(next.attrs.placement), selected: editor.isEditable && selected, resizable: editor.isEditable,
  });
  writeMedia(node.attrs);
  // The generated type knows Image's own resize event; the widened one is the root as the DOM sees it.
  const image = createUiImage({ ...props(node), attributes: { contenteditable: "false", "data-looma-image-node": "" }, slots: { media: [media] } });
  const dom = element(image);
  // ProseMirror owns this element's lifetime, so the view sets its props as a framework adapter does.
  const render = () => {
    writeMedia(current.attrs);
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
      delivery = deliveryAttributes(nextDecorations);
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
