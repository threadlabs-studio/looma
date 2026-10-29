import { Extension } from "@tiptap/core";
import type { JSONContent } from "@tiptap/core";
import { DOMParser as ProseMirrorDOMParser, Fragment, type Schema, Slice } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import DOMPurify from "dompurify";
import { splitLoomaFrontmatter } from "../../markdown";
import { parse, type Node as MarkdownNode } from "expressmark";
import { markdownToEditorDocument } from "../expressmark";

const HTML_DOCUMENT_PATTERN = /<!doctype\s+html\b|<(?:html|body)\b[^>]*>/i;
const HTML_PAIRED_TAG_PATTERN = /<(h[1-6]|p|ul|ol|li|blockquote|table|thead|tbody|tfoot|tr|th|td|figure|figcaption|article|section|header|footer|main|div|span|strong|em|b|i|a|code|pre)\b[^>]*>[\s\S]*?<\/\1\s*>/i;
const HTML_VOID_TAG_PATTERN = /<(?:img|hr|br)\b[^>]*\/?\s*>/i;

function selectionIsInsideCodeBlock(parentTypeName: string): boolean {
  return parentTypeName === "codeBlock";
}

function looksLikeDocumentHtml(value: string): boolean {
  const match = value.match(HTML_DOCUMENT_PATTERN)
    ?? value.match(HTML_PAIRED_TAG_PATTERN)
    ?? value.match(HTML_VOID_TAG_PATTERN);
  if (!match) return false;

  // Leading whitespace, comments, declarations, and ordinary prose are valid
  // around an HTML fragment. A tag inside a source-code string is not a document.
  const prefix = value.slice(0, match.index)
    .replace(/<!--[^]*?-->/g, "")
    .replace(/<\?[^]*?\?>/g, "")
    .trim();
  return !/[={};`"']|=>|\b(?:const|let|var|return|function|class|import|export)\b/.test(prefix);
}

const MARKDOWN_BLOCKS = new Set(["list", "blockquote", "table", "container", "leaf", "footnoteDefinition", "definition"]);
const MARKDOWN_INLINES = new Set(["image", "strong", "inline", "footnoteReference", "linkReference"]);

function looksLikeMarkdown(value: string): boolean {
  const visit = (node: MarkdownNode): boolean => {
    if (node.type === "heading") return Boolean(node.value?.trim() || node.children?.length);
    if (MARKDOWN_BLOCKS.has(node.type) || MARKDOWN_INLINES.has(node.type)) return true;
    if (node.type === "code") return node.source?.form !== "indented";
    // A bare URL is a link to Looma Markdown, but on its own it is not evidence of Markdown.
    if (node.type === "link") return node.source?.form !== "bare";
    return (node.body ?? node.children ?? []).some(visit);
  };
  return visit(parse(value, { syntax: "compatible" }));
}

function hasRichClipboardStructure(value: string): boolean {
  if (!value.trim()) return false;
  const body = new globalThis.DOMParser().parseFromString(value, "text/html").body;
  // A source editor may provide HTML merely to preserve its literal lines.
  // Its pre/code wrapper is not evidence that those lines were formatted.
  const pre = body.querySelector("pre");
  if (pre && body.textContent?.trim() === pre.textContent?.trim()) return false;
  const outsideSource = (selector: string) => [...body.querySelectorAll(selector)]
    .some((element) => !element.closest("pre, code"));
  if (outsideSource("h1, h2, h3, h4, h5, h6, ul, ol, li, blockquote, table, th, td, strong, em, b, i, a, img, hr, [data-looma-chip], [data-looma-mention]")) {
    return true;
  }
  if (outsideSource("[style]")) return true;
  if (body.querySelector("[data-pm-slice]") && !body.querySelector("pre")) return true;
  return body.querySelectorAll("p").length > 1;
}

function parseHtmlSlice(schema: Schema, value: string, fromHtml = false): Slice | null {
  const parsed = new globalThis.DOMParser().parseFromString(value, "text/html");
  if (parsed.body.style.display === "none") return Slice.empty;
  for (const element of parsed.body.querySelectorAll<HTMLElement>("[style]")) {
    if (element.style.display === "none") element.remove();
  }
  // Layout wrappers often place separate labels in sibling spans without
  // source whitespace. Their visual gap disappears when the wrappers become
  // plain editor text, so retain one readable separator before reconstruction.
  for (const wrapper of parsed.body.querySelectorAll("div")) {
    for (const child of wrapper.children) {
      const next = child.nextSibling;
      if (child.localName !== "span" || next?.nodeType !== 1 || (next as Element).localName !== "span") continue;
      if (!child.textContent?.trim() || !next.textContent?.trim()) continue;
      if (/\s$/.test(child.textContent) || /^\s/.test(next.textContent)) continue;
      wrapper.insertBefore(parsed.createTextNode(" "), next);
    }
  }
  // Most HTML sources end code with the newline that closes its last line. Kept,
  // it becomes an empty last line in the code block. Looma Markdown renders code without it.
  for (const pre of fromHtml ? parsed.body.querySelectorAll("pre") : []) {
    let last: Node = pre;
    while (last.lastChild) last = last.lastChild;
    if (last.nodeType === Node.TEXT_NODE) last.textContent = last.textContent?.replace(/\r?\n$/, "") ?? "";
  }
  const container = document.createElement("div");
  container.append(DOMPurify.sanitize(parsed.body.innerHTML, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "template"],
    FORBID_ATTR: ["style"],
    // Looma Markdown's callout, as `:::` containers and alerts render it.
    ADD_TAGS: ["ui-callout", "ui-tabs"],
    ADD_ATTR: ["tone", "heading", "group"],
    RETURN_DOM_FRAGMENT: true,
  }));
  if (!container.textContent?.trim() && !container.querySelector("img, hr")) return Slice.empty;
  return ProseMirrorDOMParser.fromSchema(schema).parseSlice(container, {
    preserveWhitespace: false,
  });
}

// The editor content of pasted Markdown, or null when it holds something the editor cannot.
function markdownSlice(schema: Schema, markdown: string, frontmatter: string | null): Slice | null {
  let content: JSONContent[];
  try { content = markdownToEditorDocument(markdown).content ?? []; } catch { return null; }
  if (frontmatter !== null) content.unshift({ type: "codeBlock", attrs: { language: "yaml" }, content: [{ type: "text", text: frontmatter }] });
  if (!content.length) return Slice.empty;
  return Slice.maxOpen(Fragment.fromArray(content.map(node => schema.nodeFromJSON(node))));
}

function documentSlice(schema: Schema, plainText: string): Slice | null {
  const frontmatter = splitLoomaFrontmatter(plainText);
  if (frontmatter) return markdownSlice(schema, frontmatter.body, frontmatter.source);
  // HTML source the editor's Markdown reading cannot hold is read as HTML.
  const markdown = looksLikeMarkdown(plainText) ? markdownSlice(schema, plainText, null) : null;
  if (markdown) return markdown;
  if (looksLikeDocumentHtml(plainText)) {
    return parseHtmlSlice(schema, plainText, true);
  }
  return null;
}

/**
 * Interprets recognizable document markup before Tiptap's generic paste
 * handling can turn preformatted clipboard HTML into a literal code block.
 *
 * Document content is detected from text, not source-editor clipboard metadata.
 * Unrecognized source code and explicit code-block context remain literal.
 *
 * @contract Recognized document markup is sanitized and dispatched as one paste
 * transaction; every unrecognized or code-oriented payload returns control to
 * Tiptap's remaining paste handlers without changing the document.
 */
export const LoomaSmartPaste = Extension.create({
  name: "loomaSmartPaste",
  priority: 1_100,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (view, event) => {
            if (!event.clipboardData) return false;
            if (selectionIsInsideCodeBlock(view.state.selection.$from.parent.type.name)) {
              return false;
            }

            const plainText = event.clipboardData.getData("text/plain");
            if (!plainText.trim()) return false;
            if (hasRichClipboardStructure(event.clipboardData.getData("text/html"))) return false;
            let slice = documentSlice(view.state.schema, plainText);
            if (!slice) return false;
            // As ProseMirror does for the slices it parses.
            view.someProp("transformPasted", (transform) => { slice = transform(slice!, view, true); });
            if (slice.size === 0) return true;

            const transaction = view.state.tr
              .replaceSelection(slice)
              .scrollIntoView()
              .setMeta("paste", true)
              .setMeta("uiEvent", "paste");
            view.dispatch(transaction);
            return true;
          },
        },
      }),
    ];
  },
});
