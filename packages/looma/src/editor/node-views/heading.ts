import type { NodeViewRenderer } from "@tiptap/core";
import { createHeadingLink } from "../heading-link";

/** The content span belongs to ProseMirror; the copy control never enters saved HTML or JSON. */
export const headingNodeView: NodeViewRenderer = ({ node }) => {
  let current = node;
  const dom = document.createElement(`h${node.attrs.level}`);
  const contentDOM = document.createElement("span");
  const link = createHeadingLink(dom);
  const updateAnchor = () => {
    if (current.attrs.id) dom.id = String(current.attrs.id);
    else dom.removeAttribute("id");
    link.dom.hidden = !current.attrs.id;
  };
  updateAnchor();
  dom.append(contentDOM, link.dom);
  return {
    dom, contentDOM,
    update(next) {
      if (next.type !== current.type || next.attrs.level !== current.attrs.level) return false;
      current = next;
      updateAnchor();
      return true;
    },
    stopEvent: event => event.target instanceof Node && link.dom.contains(event.target),
    ignoreMutation: mutation => mutation.type !== "selection" && !contentDOM.contains(mutation.target),
    destroy: link.destroy,
  };
};
