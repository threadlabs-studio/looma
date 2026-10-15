import MarkdownIt from "markdown-it";
import type StateBlock from "markdown-it/lib/rules_block/state_block.mjs";
import type StateCore from "markdown-it/lib/rules_core/state_core.mjs";
import { defaultMarkdownSerializer, MarkdownSerializer, type MarkdownSerializerState } from "@tiptap/pm/markdown";
import { DOMSerializer, type Node as ProseMirrorNode } from "@tiptap/pm/model";
import { normalizeLoomaCalloutTone } from "./callout";

// The shared block vocabulary's Markdown: `::: tone Title` … `:::`, `::: details Title`, and GitHub alerts.
const CONTAINER_NAMES = new Set(["note", "tip", "info", "important", "warning", "danger", "caution", "details"]);
const CONTAINER_OPEN = /^(:{3,})[ \t]*([A-Za-z]+)(?:[ \t]+(.*?))?[ \t]*$/;
const CONTAINER_CLOSE = /^:{3,}[ \t]*$/;
const OPEN_FLAG = /[ \t]*\{open\}$/;
const ALERT = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\n|$)/i;

function lineText(state: StateBlock, line: number): string {
  return state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]);
}

// ponytail: a `:::` line inside a fenced code block in a container still counts as a marker;
// track fences here if that case appears in real content.
function container(state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
  if (state.sCount[startLine] - state.blkIndent >= 4) return false;
  const match = CONTAINER_OPEN.exec(lineText(state, startLine));
  if (!match || !CONTAINER_NAMES.has(match[2].toLowerCase())) return false;
  if (silent) return true;
  // Containers nest; each closing line closes the innermost open one.
  let depth = 1;
  let next = startLine + 1;
  for (; next < endLine; next++) {
    if (state.sCount[next] < state.blkIndent) break;
    const text = lineText(state, next);
    if (CONTAINER_CLOSE.test(text)) { if (--depth === 0) break; }
    else if (CONTAINER_OPEN.test(text) && CONTAINER_NAMES.has(CONTAINER_OPEN.exec(text)![2].toLowerCase())) depth++;
  }
  const name = match[2].toLowerCase();
  let title = (match[3] ?? "").trim();
  const open = OPEN_FLAG.test(title);
  title = title.replace(OPEN_FLAG, "");
  const parentType = state.parentType;
  const lineMax = state.lineMax;
  state.parentType = "container" as typeof state.parentType;
  state.lineMax = next;
  const opening = state.push("looma_container_open", "", 1);
  Object.assign(opening, { info: name, meta: { title, open }, block: true, map: [startLine, next], markup: match[1] });
  state.md.block.tokenize(state, startLine + 1, next);
  const closing = state.push("looma_container_close", "", -1);
  Object.assign(closing, { info: name, block: true, markup: match[1] });
  state.parentType = parentType;
  state.lineMax = lineMax;
  state.line = Math.min(next + 1, endLine);
  return true;
}

// `> [!TIP]` as the first line of a blockquote makes it a callout.
function alerts(state: StateCore): void {
  const tokens = state.tokens;
  for (let index = 0; index < tokens.length; index++) {
    if (tokens[index].type !== "blockquote_open" || tokens[index + 1]?.type !== "paragraph_open") continue;
    const inline = tokens[index + 2];
    const match = inline?.type === "inline" ? ALERT.exec(inline.content) : null;
    if (!match) continue;
    inline.content = inline.content.slice(match[0].length);
    if (!inline.content.trim()) tokens.splice(index + 1, 3);
    tokens[index].tag = "ui-callout";
    tokens[index].attrSet("tone", normalizeLoomaCalloutTone(match[1]));
    for (let depth = 0, end = index; end < tokens.length; end++) {
      if (tokens[end].type === "blockquote_open") depth++;
      else if (tokens[end].type === "blockquote_close" && --depth === 0) { tokens[end].tag = "ui-callout"; break; }
    }
  }
}

function withSharedBlocks(md: MarkdownIt): MarkdownIt {
  const escape = md.utils.escapeHtml;
  md.block.ruler.before("fence", "looma_container", container, { alt: ["paragraph", "reference", "blockquote", "list"] });
  md.core.ruler.before("inline", "looma_alerts", alerts);
  md.renderer.rules.looma_container_open = (tokens, index) => {
    const { info, meta } = tokens[index];
    if (info === "details") return `<details${meta.open ? " open" : ""}><summary>${escape(meta.title || "Details")}</summary>\n`;
    return `<ui-callout tone="${normalizeLoomaCalloutTone(info)}"${meta.title ? ` heading="${escape(meta.title)}"` : ""}>\n`;
  };
  md.renderer.rules.looma_container_close = (tokens, index) => tokens[index].info === "details" ? "</details>\n" : "</ui-callout>\n";
  return md;
}

/** The markdown-it instance LoomaEditor imports Markdown with, shared block vocabulary included. */
export const loomaMarkdown = withSharedBlocks(new MarkdownIt({ html: true, linkify: false, typographer: false }));

/**
 * Renders Markdown, including the shared block vocabulary, as HTML the editor parses.
 * @contract The result is not sanitized; pass it to the editor's `setContent`, whose schema
 * keeps only content it knows.
 */
export function loomaMarkdownToHtml(source: string): string {
  // Code ends with the newline that closes its last line; kept, it becomes an empty last line.
  return loomaMarkdown.render(source).replace(/\n<\/code><\/pre>/g, "</code></pre>");
}

const containerDepth = (node: ProseMirrorNode): number => {
  let depth = 0;
  node.descendants(child => {
    if (child.type.name === "loomaCallout" || child.type.name === "loomaExpand") depth = Math.max(depth, 1 + containerDepth(child));
    return false;
  });
  return depth;
};

// An outer container takes more colons than any it contains, as VitePress and Markupress expect.
function writeContainer(state: MarkdownSerializerState, node: ProseMirrorNode, opening: string): void {
  const marker = ":".repeat(3 + containerDepth(node));
  state.write(`${marker} ${opening}`.trimEnd());
  state.ensureNewLine();
  state.renderContent(node);
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
  bulletList: defaults.bullet_list,
  orderedList: (state, node) => {
    const start = Number(node.attrs.start ?? 1);
    state.renderList(node, "   ", index => `${start + index}. `);
  },
  listItem: defaults.list_item,
  hardBreak: defaults.hard_break,
  codeBlock: (state, node) => {
    const longest = Math.max(0, ...(node.textContent.match(/`+/g) ?? []).map(run => run.length));
    const fence = "`".repeat(Math.max(3, longest + 1));
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
 * Writes an editor document as Markdown, with callouts and expand sections in the shared
 * `:::` syntax that `loomaMarkdownToHtml` and Markupress read.
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
