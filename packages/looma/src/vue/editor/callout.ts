import type { NodeViewRenderer } from "@tiptap/core";
import { createApp, h, shallowRef } from "vue";
import { Callout } from "@threadlabs/looma/vue";

/**
 * Draws an editor callout with Looma's Callout, so it looks the same as a callout in any page.
 * @lifecycle ProseMirror owns the content DOM inside Callout's slot; destroying the view
 * releases its Vue app.
 */
export const calloutNodeView: NodeViewRenderer = ({ node }) => {
  const dom = document.createElement("div");
  dom.dataset.loomaCallout = "";
  const current = shallowRef(node);
  let contentDOM!: HTMLElement;
  const app = createApp({
    render: () => h(Callout, { tone: current.value.attrs.tone, heading: current.value.attrs.heading || undefined }, () => h("div", {
      "data-looma-callout-body": "", ref: (element: unknown) => { if (element) contentDOM = element as HTMLElement; },
    })),
  });
  app.mount(dom);
  return {
    dom, contentDOM,
    update(next) {
      if (next.type !== current.value.type) return false;
      current.value = next;
      return true;
    },
    ignoreMutation: mutation => mutation.type !== "selection" && !contentDOM.contains(mutation.target),
    destroy() { app.unmount(); },
  };
};
