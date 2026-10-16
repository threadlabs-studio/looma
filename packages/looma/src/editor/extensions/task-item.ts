import { mergeAttributes } from "@tiptap/core";
import TaskItem from "@tiptap/extension-task-item";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

let taskSequence = 0;

/** A task item's accessible name: its text, or "Task" while it has none. */
const taskName = (node: ProseMirrorNode) => node.textContent.trim() || "Task";

/**
 * Tiptap's task item with each checkbox named by its item's text, so a screen reader announces
 * the task rather than an unnamed checkbox. In the editor the checkbox points at the item's own
 * content with `aria-labelledby`, so the name follows every edit; saved HTML has no element to point
 * at, so its checkbox carries the text as `aria-label`.
 */
export const LoomaTaskItem = TaskItem.extend({
  renderHTML({ node, HTMLAttributes }) {
    return [
      "li",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { "data-type": this.name }),
      ["label", ["input", { type: "checkbox", checked: node.attrs.checked ? "checked" : null, "aria-label": taskName(node) }], ["span"]],
      ["div", 0],
    ];
  },

  addNodeView() {
    // Tiptap's TaskItem always has a node view; this one names its checkbox.
    const parent = this.parent!();
    return (props) => {
      const view = parent(props);
      const checkbox = view.dom instanceof Element ? view.dom.querySelector<HTMLInputElement>('input[type="checkbox"]') : null;
      const content = view.contentDOM;
      if (!checkbox || !(content instanceof HTMLElement)) return view;
      content.id ||= `looma-task-${++taskSequence}`;
      // Tiptap's view writes a label from the item it was created with; the content is always current.
      // An empty item's content names nothing, so it is named "Task" until it has text.
      const name = (node: ProseMirrorNode) => {
        if (node.textContent.trim()) {
          checkbox.setAttribute("aria-labelledby", content.id);
          checkbox.removeAttribute("aria-label");
        } else {
          checkbox.removeAttribute("aria-labelledby");
          checkbox.setAttribute("aria-label", "Task");
        }
      };
      name(props.node);
      return {
        ...view,
        update: (...args: Parameters<NonNullable<typeof view.update>>) => {
          const kept = view.update?.(...args) ?? false;
          if (kept) name(args[0]);
          return kept;
        },
      };
    };
  },
});
