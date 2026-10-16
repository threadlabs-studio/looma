import { defaultMarkdownSerializer, MarkdownSerializer, type MarkdownSerializerState } from "@tiptap/pm/markdown";
import { DOMSerializer, type Node as ProseMirrorNode } from "@tiptap/pm/model";
import { loomaCodeFence, loomaContainerMarker } from "../../markdown";
import { createLoomaMarkdownIt } from "../../markdown/markdown-it";

/** The markdown-it instance LoomaEditor reads Looma Markdown with. */
export const loomaMarkdown = createLoomaMarkdownIt();

/**
 * Renders Looma Markdown as the HTML the editor parses.
 * @contract The result is not sanitized; pass it to the editor's `setContent`, whose schema
 * keeps only content it knows. Front matter renders nothing.
 */
export function loomaMarkdownToHtml(source: string): string {
  return loomaMarkdown.render(source);
}

const containerDepth = (node: ProseMirrorNode): number => {
  let depth = 0;
  node.descendants(child => {
    if (child.type.name === "loomaCallout" || child.type.name === "loomaExpand") depth = Math.max(depth, 1 + containerDepth(child));
    return false;
  });
  return depth;
};

// An outer container takes more colons than any it contains, and its closing line follows its
// content directly.
function writeContainer(state: MarkdownSerializerState, node: ProseMirrorNode, opening: string): void {
  const marker = loomaContainerMarker(containerDepth(node));
  state.write(`${marker} ${opening}`.trimEnd());
  state.ensureNewLine();
  state.renderContent(node);
  // ponytail: flushClose is prosemirror-markdown's own (untyped) way to end a block with one newline
  // instead of a blank line; replace it if a release removes it.
  (state as unknown as { flushClose(size: number): void }).flushClose(1);
  state.write(marker);
  state.closeBlock(node);
}

type NodeSerializer = (state: MarkdownSerializerState, node: ProseMirrorNode, parent: ProseMirrorNode, index: number) => void;
type MarkSerializer = { open: string; close: string; mixable?: boolean; expelEnclosingWhitespace?: boolean; escape?: boolean };

const defaults = defaultMarkdownSerializer.nodes;
const NODES: Record<string, NodeSerializer> = {
  paragraph: defaults.paragraph,
  text: defaults.text,
  blockquote: defaults.blockquote,
  heading: defaults.heading,
  horizontalRule: defaults.horizontal_rule,
  bulletList: (state, node) => state.renderList(node, "  ", () => "- "),
  orderedList: (state, node) => {
    const start = Number(node.attrs.start ?? 1);
    state.renderList(node, "   ", index => `${start + index}. `);
  },
  listItem: defaults.list_item,
  hardBreak: defaults.hard_break,
  codeBlock: (state, node) => {
    const fence = loomaCodeFence(node.textContent);
    state.write(`${fence}${node.attrs.language ?? ""}\n`);
    state.text(node.textContent, false);
    state.ensureNewLine();
    state.write(fence);
    state.closeBlock(node);
  },
  loomaCallout: (state, node) => writeContainer(state, node, `${node.attrs.tone} ${node.attrs.heading ?? ""}`),
  loomaExpand: (state, node) => writeContainer(state, node, `details ${node.attrs.summary}${node.attrs.open ? " {open}" : ""}`),
};
const MARKS: Record<string, MarkSerializer> = {
  bold: defaultMarkdownSerializer.marks.strong as MarkSerializer,
  italic: defaultMarkdownSerializer.marks.em as MarkSerializer,
  code: defaultMarkdownSerializer.marks.code as MarkSerializer,
  link: defaultMarkdownSerializer.marks.link as MarkSerializer,
  strike: { open: "~~", close: "~~", mixable: true, expelEnclosingWhitespace: true },
  underline: { open: "<u>", close: "</u>", mixable: true },
  highlight: { open: "<mark>", close: "</mark>", mixable: true },
};

/**
 * Writes an editor document as Looma Markdown, with callouts and expand sections as `:::`
 * containers that `loomaMarkdownToHtml` and Markupress read.
 * @contract Content Markdown has no syntax for (tables, task lists, images, chips, mentions,
 * the table of contents) is written as its saved HTML, which Markdown carries unchanged.
 * Marks without a Markdown form other than underline and highlight are dropped.
 */
export function loomaMarkdownFromDoc(doc: ProseMirrorNode): string {
  const dom = DOMSerializer.fromSchema(doc.type.schema);
  const html = (node: ProseMirrorNode) => {
    const holder = document.createElement("div");
    holder.append(dom.serializeNode(node));
    return holder.innerHTML;
  };
  const nodes: Record<string, NodeSerializer> = {};
  for (const name of Object.keys(doc.type.schema.nodes)) {
    nodes[name] = NODES[name] ?? ((state, node) => {
      state.write(html(node));
      if (node.isBlock) state.closeBlock(node);
    });
  }
  const marks: Record<string, MarkSerializer> = {};
  for (const name of Object.keys(doc.type.schema.marks)) marks[name] = MARKS[name] ?? { open: "", close: "" };
  return new MarkdownSerializer(nodes, marks as Record<string, never>).serialize(doc, { tightLists: true });
}
