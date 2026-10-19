import type { NodeViewRenderer } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { componentRegistry } from "@nextwebwg/html-next/runtime";
import { createUiCallout } from "@threadlabs/looma/vanilla/UiCallout.js";

const calloutProps = (node: ProseMirrorNode) => ({ tone: node.attrs.tone, heading: node.attrs.heading || undefined });

/**
 * Draws an editor callout with Looma's Callout, so it looks the same as a callout in any page.
 * @lifecycle ProseMirror owns the content DOM in Callout's slot and sets the tone and heading as the
 * node changes. Callout disconnects once ProseMirror removes the view's element.
 */
export const calloutNodeView: NodeViewRenderer = ({ node }) => {
  const dom = document.createElement("div");
  dom.dataset.loomaCallout = "";
  const contentDOM = document.createElement("div");
  contentDOM.dataset.loomaCalloutBody = "";
  // A plain element to ProseMirror and the DOM.
  const callout: HTMLElement = createUiCallout({ ...calloutProps(node), children: [contentDOM] });
  dom.append(callout);
  let current = node;
  return {
    dom, contentDOM,
    update(next) {
      if (next.type !== current.type) return false;
      current = next;
      // ProseMirror owns this element's lifetime, so the node view sets its props as a framework adapter does.
      componentRegistry.update(callout, calloutProps(next));
      return true;
    },
    ignoreMutation: (mutation) => mutation.type !== "selection" && !contentDOM.contains(mutation.target),
  };
};
