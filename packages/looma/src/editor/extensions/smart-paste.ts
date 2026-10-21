import { Extension } from "@tiptap/core";
import { DOMParser as ProseMirrorDOMParser, type Schema, Slice } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import DOMPurify from "dompurify";
import { splitLoomaFrontmatter } from "../../markdown";
import { loomaMarkdown as markdown } from "./markdown";

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

function looksLikeMarkdown(value: string): boolean {
  const tokens = markdown.parse(value, {});
  return tokens.some((token, index) => {
    if (token.type === "heading_open") {
      return Boolean(tokens[index + 1]?.content.trim());
    }
    if (["bullet_list_open", "ordered_list_open", "blockquote_open", "fence", "table_open", "looma_container_open", "looma_toc"].includes(token.type)) {
      return true;
    }
    // A bare URL is a link to Looma Markdown, but on its own it is not evidence of Markdown.
    return token.type === "inline" && Boolean(token.children?.some((child) =>
      (child.type === "link_open" && child.markup !== "linkify") || ["image", "strong_open", "looma_chip", "looma_mention", "looma_footnote_ref"].includes(child.type)));
  });
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

function escapeHtmlText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function documentSlice(schema: Schema, plainText: string): Slice | null {
  const frontmatter = splitLoomaFrontmatter(plainText);
  if (frontmatter || looksLikeMarkdown(plainText)) {
    return parseHtmlSlice(schema, frontmatter
      ? `<pre><code class="language-yaml">${escapeHtmlText(frontmatter.source)}</code></pre>${markdown.render(frontmatter.body)}`
      : markdown.render(plainText));
  }
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
