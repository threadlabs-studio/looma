import { Node } from "@tiptap/core";

/**
 * Tabs or a code group, kept whole so Looma Markdown's `::: tabs` and `::: code-group` survive
 * editing. Saved as `<ui-tabs group>` with a `<section aria-label>` per panel.
 * @contract While editing, panels show one after another under their labels; the Tabs component
 * draws them only where the saved HTML renders.
 */
export const LoomaTabs = Node.create({
  name: "loomaTabs",
  group: "block",
  content: "loomaTab+",
  defining: true,
  isolating: true,
  addAttributes() {
    return {
      group: { default: "", parseHTML: element => element.getAttribute("group") ?? "", renderHTML: attributes => attributes.group ? { group: attributes.group } : {} },
      codeGroup: { default: false, parseHTML: element => element.classList.contains("code-group"), renderHTML: attributes => attributes.codeGroup ? { class: "code-group" } : {} },
    };
  },
  parseHTML() {
    return [{ tag: "ui-tabs" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["ui-tabs", HTMLAttributes, 0];
  },
  // The Tabs component would take over the editable panels, so editing draws a plain container.
  addNodeView() {
    return () => {
      const dom = document.createElement("div");
      dom.dataset.loomaTabs = "";
      return { dom, contentDOM: dom };
    };
  },
});

/**
 * One panel of `LoomaTabs`, labelled by `label`.
 * @invariant It exists only inside `LoomaTabs`; its label is the tab Tabs shows and the `== Label` line Markdown writes.
 */
export const LoomaTab = Node.create({
  name: "loomaTab",
  content: "block+",
  defining: true,
  isolating: true,
  addAttributes() {
    return {
      label: { default: "", parseHTML: element => element.getAttribute("aria-label") ?? "", renderHTML: attributes => ({ "aria-label": attributes.label }) },
    };
  },
  parseHTML() {
    return [{ tag: "ui-tabs > section" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["section", HTMLAttributes, 0];
  },
  addNodeView() {
    return ({ node }) => {
      let current = node;
      const dom = document.createElement("section");
      const label = document.createElement("div");
      label.contentEditable = "false";
      label.dataset.loomaTabLabel = "";
      label.textContent = node.attrs.label;
      const contentDOM = document.createElement("div");
      dom.setAttribute("aria-label", node.attrs.label);
      dom.append(label, contentDOM);
      return {
        dom, contentDOM,
        update(next) {
          if (next.type !== current.type) return false;
          current = next;
          label.textContent = next.attrs.label;
          dom.setAttribute("aria-label", next.attrs.label);
          return true;
        },
        ignoreMutation: mutation => mutation.type !== "selection" && !contentDOM.contains(mutation.target),
      };
    };
  },
});
