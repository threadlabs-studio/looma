import { defaultMarkdownSerializer, MarkdownSerializer, type MarkdownSerializerState } from "@tiptap/pm/markdown";
import { DOMSerializer, type Node as ProseMirrorNode } from "@tiptap/pm/model";
import { assignLoomaHeadingIds, formatLoomaAttributes, LOOMA_CONTAINER_NAMES, loomaCodeFence, loomaContainerMarker, normalizeLoomaChipTone, parseLoomaFenceInfo } from "../../markdown";
import { createLoomaMarkdownIt } from "../../markdown/markdown-it";

/** The markdown-it instance LoomaEditor reads Looma Markdown with; code keeps its notation as source. */
export const loomaMarkdown = createLoomaMarkdownIt({ codeNotation: "keep" });

/**
 * Renders Looma Markdown as the HTML the editor parses.
 * @contract The result is not sanitized; pass it to the editor's `setContent`, whose schema
 * keeps only content it knows. Front matter renders nothing.
 */
export function loomaMarkdownToHtml(source: string): string {
  return loomaMarkdown.render(source);
}

const CONTAINERS = new Set(["loomaCallout", "loomaExpand", "loomaFigure", "loomaTabs"]);
const containerDepth = (node: ProseMirrorNode): number => {
  let depth = 0;
  node.descendants(child => {
    if (!CONTAINERS.has(child.type.name)) return true;
    depth = Math.max(depth, 1 + containerDepth(child));
    return false;
  });
  return depth;
};

// ponytail: flushClose is prosemirror-markdown's own (untyped) way to end a block with one newline
// instead of a blank line; replace it if a release removes it.
const endLine = (state: MarkdownSerializerState) => (state as unknown as { flushClose(size: number): void }).flushClose(1);

// An outer container takes more colons than any it contains, and its closing line follows its
// content directly.
function writeContainer(state: MarkdownSerializerState, node: ProseMirrorNode, opening: string, content = () => state.renderContent(node)): void {
  const marker = loomaContainerMarker(containerDepth(node));
  state.write(`${marker} ${opening}`.trimEnd());
  state.ensureNewLine();
  content();
  endLine(state);
  state.write(marker);
  state.closeBlock(node);
}

type NodeSerializer = (state: MarkdownSerializerState, node: ProseMirrorNode, parent: ProseMirrorNode, index: number) => void;
type MarkSerializer = { open: string; close: string; mixable?: boolean; expelEnclosingWhitespace?: boolean; escape?: boolean };

const defaults = defaultMarkdownSerializer.nodes;
const label = (text: string) => text.replace(/[\\\]]/g, "\\$&");
const ALIGNMENT: Record<string, string> = { left: ":---", center: ":---:", right: "---:" };

const NODES: Record<string, NodeSerializer> = {
  paragraph: defaults.paragraph,
  // Text that starts a line as a container marker or `::toc` would read as a Looma block.
  text: (state, node, parent, index) => {
    const marker = /^:{3,}[ \t]*([A-Za-z][\w-]*)?/.exec(node.text ?? "");
    const block = marker ? !marker[1] || LOOMA_CONTAINER_NAMES.has(marker[1].toLowerCase()) : /^::toc(?![\w-])/i.test(node.text ?? "");
    if (block && (state as unknown as { atBlank(): boolean }).atBlank()) state.write("\\");
    defaults.text(state, node, parent, index);
  },
  blockquote: defaults.blockquote,
  horizontalRule: defaults.horizontal_rule,
  bulletList: (state, node) => state.renderList(node, "  ", () => "- "),
  orderedList: (state, node) => {
    const start = Number(node.attrs.start ?? 1);
    state.renderList(node, "   ", index => `${start + index}. `);
  },
  listItem: defaults.list_item,
  taskList: (state, node) => state.renderList(node, "  ", () => "- "),
  taskItem: (state, node) => {
    state.write(node.attrs.checked ? "[x] " : "[ ] ");
    state.renderContent(node);
  },
  hardBreak: defaults.hard_break,
  codeBlock: (state, node) => {
    const fence = loomaCodeFence(node.textContent);
    state.write(`${fence}${node.attrs.language ?? ""}${node.attrs.meta ? ` ${node.attrs.meta}` : ""}\n`);
    state.text(node.textContent, false);
    state.ensureNewLine();
    state.write(fence);
    state.closeBlock(node);
  },
  image: (state, node, parent, index) => {
    defaults.image(state, node, parent, index);
    const { width, height, placement, responsive } = node.attrs;
    state.write(formatLoomaAttributes({ width, height, placement: placement && placement !== "block" ? placement : null, responsive: responsive === true }));
    if (node.isBlock) state.closeBlock(node);
  },
  loomaCallout: (state, node) => writeContainer(state, node, `${node.attrs.tone} ${node.attrs.heading ?? ""}`),
  loomaExpand: (state, node) => writeContainer(state, node, `details ${node.attrs.summary}${node.attrs.open ? " {open}" : ""}`),
  loomaFigure: (state, node) => {
    const caption = node.lastChild!;
    const marker = loomaContainerMarker(containerDepth(node));
    state.write(`${marker} figure`);
    if (caption.content.size) { state.write(" "); state.renderInline(caption, false); }
    state.ensureNewLine();
    state.render(node.firstChild!, node, 0);
    endLine(state);
    state.write(marker);
    state.closeBlock(node);
  },
  loomaFigcaption: (state, node) => state.renderInline(node),
  loomaTabs: (state, node) => {
    const name = node.attrs.codeGroup ? "code-group" : "tabs";
    // A code group whose every panel is one fence labelled by its title or language needs no labels.
    const bare = node.attrs.codeGroup && Array.from({ length: node.childCount }, (_, index) => node.child(index)).every(tab => {
      const code = tab.firstChild;
      if (tab.childCount !== 1 || code?.type.name !== "codeBlock") return false;
      const { title, language } = parseLoomaFenceInfo(`${code.attrs.language ?? ""} ${code.attrs.meta ?? ""}`);
      return tab.attrs.label === (title ?? language ?? "Code");
    });
    writeContainer(state, node, `${name} ${node.attrs.group && node.attrs.group !== name ? node.attrs.group : ""}`, () => node.forEach((tab, _offset, index) => {
      if (index) endLine(state);
      if (!bare) { state.write(`== ${tab.attrs.label}`); state.ensureNewLine(); }
      state.renderContent(tab);
    }));
  },
  loomaTab: (state, node) => state.renderContent(node),
  loomaTableOfContents: (state, node) => {
    const { format, depth } = node.attrs;
    state.write(`::toc${formatLoomaAttributes({ depth: depth !== 3 ? depth : null, format: format !== "plain" ? format : null })}`);
    state.closeBlock(node);
  },
  loomaChip: (state, node) => {
    const tone = normalizeLoomaChipTone(node.attrs.color);
    state.write(`:chip[${label(String(node.attrs.label ?? ""))}]${formatLoomaAttributes({ tone: tone !== "neutral" ? tone : null })}`);
  },
  mention: (state, node) => {
    const id = String(node.attrs.id ?? "");
    state.write(`:mention[${label(String(node.attrs.label ?? id))}]${formatLoomaAttributes({ id }, { hashId: false })}`);
  },
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

// The headings whose ID a reader would not derive from the written text, so they need `{#id}`.
// Marking a heading reserves its ID, which can change what later headings derive, so headings are
// marked one at a time, in order, until every derived ID matches.
function customHeadingIds(doc: ProseMirrorNode): Set<number> {
  const headings: { text: string; id?: string }[] = [];
  doc.descendants(node => {
    if (node.type.name === "heading") headings.push({ text: node.textContent.trim(), id: typeof node.attrs.id === "string" && node.attrs.id ? node.attrs.id : undefined });
  });
  const marked = new Set<number>();
  for (;;) {
    const derived = assignLoomaHeadingIds(headings.map(({ text, id }, index) => ({ text, id: marked.has(index) ? id : undefined })));
    const next = headings.findIndex(({ id }, index) => id && !marked.has(index) && derived[index] !== id);
    if (next < 0) return marked;
    marked.add(next);
  }
}

/**
 * Writes an editor document as Looma Markdown, the form `loomaMarkdownToHtml` and Markupress read.
 * @contract Every node in the default preset has a Markdown form. A table that fits GFM is a GFM
 * table and any other is HTML. Content from extensions outside the preset is written as its saved
 * HTML, and marks without a Markdown form other than underline and highlight are dropped.
 */
export function loomaMarkdownFromDoc(doc: ProseMirrorNode): string {
  const schema = doc.type.schema;
  const dom = DOMSerializer.fromSchema(schema);
  const html = (node: ProseMirrorNode) => {
    const holder = document.createElement("div");
    holder.append(dom.serializeNode(node));
    return holder.innerHTML;
  };
  const custom = customHeadingIds(doc);
  let heading = 0;
  const nodes: Record<string, NodeSerializer> = {
    loomaTableOfContents: (state, node, parent, index) => {
      if (node.childCount) { state.write(html(node)); state.closeBlock(node); }
      else NODES.loomaTableOfContents(state, node, parent, index);
    },
    loomaTabs: (state, node, parent, index) => {
      const hasSettings = [node.attrs.defaultValue, node.attrs.queryString, node.attrs.lazy].some(value => value !== null && value !== undefined)
        || Array.from({ length: node.childCount }, (_, index) => node.child(index)).some(tab => tab.attrs.value !== null && tab.attrs.value !== undefined);
      if (hasSettings) { state.write(html(node)); state.closeBlock(node); }
      else NODES.loomaTabs(state, node, parent, index);
    },
    heading: (state, node) => {
      state.write(`${"#".repeat(node.attrs.level)} `);
      state.renderInline(node, false);
      if (custom.has(heading++)) state.write(` {#${node.attrs.id}}`);
      else {
        // Braces that end a heading would read as its attributes.
        const out = state as unknown as { out: string };
        out.out = out.out.replace(/([ \t])\{([^{}]*\})$/, "$1\\{$2");
      }
      state.closeBlock(node);
    },
    table: (state, node) => {
      state.write(gfmTable(node) ?? `<table><tbody>${Array.from({ length: node.childCount }, (_, index) => html(node.child(index))).join("")}</tbody></table>`
        .replace(/ (?:colspan|rowspan)="1"/g, ""));
      state.closeBlock(node);
    },
  };
  for (const name of Object.keys(schema.nodes)) {
    nodes[name] ??= NODES[name] ?? ((state, node) => {
      state.write(html(node));
      if (node.isBlock) state.closeBlock(node);
    });
  }
  const marks: Record<string, MarkSerializer> = {};
  for (const name of Object.keys(schema.marks)) marks[name] = MARKS[name] ?? { open: "", close: "" };
  const serializer = new MarkdownSerializer(nodes, marks as Record<string, never>);
  const inline = (paragraph: ProseMirrorNode) => serializer.serialize(schema.topNodeType.create(null, paragraph)).replace(/\|/g, "\\|");

  // A GFM table: one header row, one alignment per column, a single line of inline content per
  // cell, and no merged cells, backgrounds or set widths.
  function gfmTable(table: ProseMirrorNode): string | null {
    const rows = Array.from({ length: table.childCount }, (_, index) => table.child(index));
    const width = rows[0]?.childCount ?? 0;
    const alignments: unknown[] = [];
    const lines: string[] = [];
    for (const [rowIndex, row] of rows.entries()) {
      if (row.childCount !== width) return null;
      const cells: string[] = [];
      for (let column = 0; column < width; column++) {
        const cell = row.child(column);
        const { colspan, rowspan, colwidth, backgroundColor, textAlign } = cell.attrs;
        const paragraph = cell.firstChild;
        if ((cell.type.name === "tableHeader") !== (rowIndex === 0) || colspan !== 1 || rowspan !== 1 || colwidth || backgroundColor
          || cell.childCount !== 1 || paragraph?.type.name !== "paragraph") return null;
        let hasBreak = false;
        paragraph.descendants(child => { if (child.type.name === "hardBreak") hasBreak = true; });
        if (hasBreak) return null;
        if (rowIndex === 0) alignments.push(textAlign ?? null);
        else if ((textAlign ?? null) !== alignments[column]) return null;
        cells.push(inline(paragraph));
      }
      lines.push(`| ${cells.join(" | ")} |`);
      if (rowIndex === 0) lines.push(`| ${alignments.map(alignment => ALIGNMENT[alignment as string] ?? "---").join(" | ")} |`);
    }
    return width ? lines.join("\n") : null;
  }

  return serializer.serialize(doc, { tightLists: true });
}
