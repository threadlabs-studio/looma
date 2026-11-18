import { Node } from "@tiptap/core";

/**
 * Inline math: TeX notation the document keeps as written. The editor shows the
 * notation as code; display math is a code block with the `math` language.
 */
export const LoomaInlineMath = Node.create({
  name: "loomaInlineMath",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return { value: { default: "", parseHTML: (element: HTMLElement) => element.textContent ?? "" } };
  },

  parseHTML() {
    return [{ tag: "code[data-looma-math]" }];
  },

  renderHTML({ node }) {
    return ["code", { class: "language-math", "data-looma-math": "" }, String(node.attrs.value ?? "")];
  },

  renderText({ node }) {
    return `$${String(node.attrs.value ?? "")}$`;
  },
});
