import { mergeAttributes, Node } from "@tiptap/core";

/** A paragraph-like block whose authored line boundaries remain significant on export. */
export const LoomaLineBlock = Node.create({
  name: "loomaLineBlock",
  group: "block",
  content: "inline*",
  parseHTML() { return [{ tag: 'div[data-type="line-block"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "line-block" }), 0];
  },
});
