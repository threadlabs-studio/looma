import { Node } from "@tiptap/core";

/**
 * A link reference definition, `[label]: url "title"`, where it is written. A link that uses one
 * keeps its label as `reference` and its spelling (`full`, `collapsed` or `shortcut`) as
 * `referenceType`, and is written as a reference while the definition still gives its destination
 * and title.
 * @invariant It renders nothing in the editor, as in Markdown; saved HTML keeps it as a hidden
 * element so the document reads back whole.
 */
export const LoomaLinkDefinition = Node.create({
  name: "loomaLinkDefinition",
  group: "block",
  atom: true,
  addAttributes() {
    const data = (name: string) => ({
      default: null,
      parseHTML: (element: HTMLElement) => element.getAttribute(`data-${name}`),
      renderHTML: (attributes: Record<string, unknown>) => attributes[name] === null ? {} : { [`data-${name}`]: attributes[name] },
    });
    return { label: data("label"), href: data("href"), title: data("title") };
  },
  addGlobalAttributes() {
    const data = (name: string, attribute: string) => ({
      default: null,
      parseHTML: (element: HTMLElement) => element.getAttribute(attribute),
      renderHTML: (attributes: Record<string, unknown>) => attributes[name] ? { [attribute]: attributes[name] } : {},
    });
    // A link's title, which Markdown links and definitions carry, is the link's own.
    return [{ types: ["link"], attributes: { title: data("title", "title"), reference: data("reference", "data-reference"), referenceType: data("referenceType", "data-reference-type") } }];
  },
  parseHTML() {
    return [{ tag: "div[data-looma-link-definition]" }];
  },
  // ponytail: hidden, so a writer never sees the definition; show it if writers need to edit one.
  renderHTML({ HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-looma-link-definition": "", hidden: "" }];
  },
});
