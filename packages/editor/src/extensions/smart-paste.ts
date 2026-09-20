import { Extension } from "@tiptap/core";
import { DOMParser as ProseMirrorDOMParser, type Schema, type Slice } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import MarkdownIt from "markdown-it";

const DOCUMENT_MARKUP_MODES = new Set(["html", "markdown", "md", "mdx"]);
const MARKDOWN_MODES = new Set(["markdown", "md", "mdx"]);
const DOCUMENT_HTML_PATTERN = /<(?:html|body|main|article|section|header|footer|h[1-6]|p|ul|ol|li|blockquote|table|thead|tbody|tfoot|tr|th|td|figure|figcaption|img|hr|aside)\b/i;
const MARKDOWN_STRUCTURE_PATTERN = /(?:^|\n)(?:#{1,6}\s+|>\s+|(?:[-+*]|\d+\.)\s+|```|~~~)|!\[[^\]]*]\([^)]*\)|\[[^\]]+]\([^)]*\)/;
const UNSAFE_HTML_SELECTOR = "script, style, noscript, iframe, object, embed, template";

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
});

function sourceEditorMode(event: ClipboardEvent): string | null {
  const metadata = event.clipboardData?.getData("vscode-editor-data");
  if (!metadata) return null;
  try {
    const value = JSON.parse(metadata) as { mode?: unknown };
    return typeof value.mode === "string" ? value.mode.toLowerCase() : null;
  } catch {
    return null;
  }
}

function selectionIsInsideCodeBlock(parentTypeName: string): boolean {
  return parentTypeName === "codeBlock";
}

function looksLikeDocumentHtml(value: string): boolean {
  return /<!doctype\s+html/i.test(value) || DOCUMENT_HTML_PATTERN.test(value);
}

function looksLikeMarkdown(value: string): boolean {
  return MARKDOWN_STRUCTURE_PATTERN.test(value);
}

function parseHtmlSlice(schema: Schema, value: string): Slice | null {
  const parsed = new globalThis.DOMParser().parseFromString(value, "text/html");
  parsed.querySelectorAll(UNSAFE_HTML_SELECTOR).forEach((element) => element.remove());
  const container = document.createElement("div");
  container.append(...Array.from(parsed.body.childNodes, (node) => node.cloneNode(true)));
  if (!container.textContent?.trim() && !container.querySelector("img, hr")) return null;
  return ProseMirrorDOMParser.fromSchema(schema).parseSlice(container, {
    preserveWhitespace: false,
  });
}

function documentSlice(
  schema: Schema,
  plainText: string,
  richHtml: string,
  mode: string | null,
): Slice | null {
  if (mode && MARKDOWN_MODES.has(mode)) {
    return parseHtmlSlice(schema, markdown.render(plainText));
  }
  if (mode === "html") {
    return parseHtmlSlice(schema, plainText);
  }
  if (!mode && !richHtml && looksLikeDocumentHtml(plainText)) {
    return parseHtmlSlice(schema, plainText);
  }
  if (!mode && !richHtml && looksLikeMarkdown(plainText)) {
    return parseHtmlSlice(schema, markdown.render(plainText));
  }
  return null;
}

/**
 * Interprets document markup copied from source-oriented tools before Tiptap's
 * generic VS Code handler can turn it into a literal code block.
 *
 * Source-editor metadata remains authoritative for non-document languages.
 * Explicit code-block context is never reinterpreted.
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
            const richHtml = event.clipboardData.getData("text/html");
            const mode = sourceEditorMode(event);
            if (mode && !DOCUMENT_MARKUP_MODES.has(mode)) return false;
            const slice = documentSlice(view.state.schema, plainText, richHtml, mode);
            if (!slice) return false;

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
