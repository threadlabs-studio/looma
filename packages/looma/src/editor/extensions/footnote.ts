import { Node } from "@tiptap/core";

// Footnote IDs as Looma Markdown writes them: `fn:label`, `fnref:label`, and `fnref:label:2` for
// a repeated reference.
const labelFrom = (href: string | null | undefined, prefix: string) => href?.startsWith(`#${prefix}`) ? href.slice(prefix.length + 1) : null;

/**
 * A footnote reference, `[^label]`, saved as `<sup><a data-footnote-ref>`.
 * @invariant `label` names its note. `number` and `occurrence` are the note's number and this
 * reference's place among the note's references, as the document had them when it loaded.
 */
export const LoomaFootnoteReference = Node.create({
  name: "loomaFootnoteReference",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    const link = (element: HTMLElement) => element.querySelector(":scope > a[data-footnote-ref]");
    const label = (element: HTMLElement) => labelFrom(link(element)?.getAttribute("href"), "fn:") ?? "";
    return {
      label: { default: "", parseHTML: label, renderHTML: () => ({}) },
      number: { default: null, parseHTML: element => Number(element.textContent) || null, renderHTML: () => ({}) },
      // The ID is `fnref:` and the label, then `:2` for the second reference.
      occurrence: { default: 1, parseHTML: element => Number(link(element)?.id.slice(`fnref:${label(element)}:`.length)) || 1, renderHTML: () => ({}) },
    };
  },
  parseHTML() {
    return [{ tag: "sup", priority: 1100, getAttrs: element => element.querySelector(":scope > a[data-footnote-ref]") ? null : false }];
  },
  renderHTML({ node }) {
    const { label, number, occurrence } = node.attrs as { label: string; number: number | null; occurrence: number };
    return ["sup", ["a", {
      href: `#fn:${label}`, id: `fnref:${label}${occurrence > 1 ? `:${occurrence}` : ""}`, "data-footnote-ref": "", "aria-describedby": "footnote:label",
    }, String(number ?? label)]];
  },
  renderText({ node }) {
    return `[^${node.attrs.label}]`;
  },
});

/**
 * The document's notes, saved as `<section data-footnotes>` with its `<ol>`.
 * @invariant It holds only footnotes; Markdown writes it as definitions after the text.
 */
export const LoomaFootnotes = Node.create({
  name: "loomaFootnotes",
  group: "block",
  content: "loomaFootnote+",
  isolating: true,
  parseHTML() {
    return [{ tag: "section[data-footnotes]", contentElement: "ol" }];
  },
  renderHTML() {
    return ["section", { "data-footnotes": "", class: "footnotes" }, ["h2", { id: "footnote:label", class: "sr-only" }, "Footnotes"], ["ol", 0]];
  },
});

/**
 * One note, `[^label]: …`, saved as `<li id="fn:label">`.
 * @invariant It exists only inside `LoomaFootnotes`. Its back-links are presentation that Looma
 * Markdown renders, so the editor reads past them and saves none.
 */
export const LoomaFootnote = Node.create({
  name: "loomaFootnote",
  content: "block+",
  defining: true,
  addAttributes() {
    return { label: { default: "", parseHTML: element => labelFrom(`#${element.id}`, "fn:") ?? "", renderHTML: () => ({}) } };
  },
  parseHTML() {
    return [
      { tag: "li", priority: 1100, context: "loomaFootnotes/" },
      { tag: "a[data-footnote-backref]", priority: 1100, ignore: true },
    ];
  },
  renderHTML({ node }) {
    return ["li", { id: `fn:${node.attrs.label}` }, 0];
  },
});
