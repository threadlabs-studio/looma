// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { Editor, type JSONContent } from "@tiptap/core";
import { editorDocumentToExpressmark, editorDocumentToMarkdown, markdownToEditorDocument } from "../src/editor/expressmark";
import { getDefaultEditorExtensions } from "../src/editor/extensions";
import { applyLoomaCodeNotation } from "../src/markdown";
import { LOOMA_MARKDOWN_FIXTURES, normalizeLoomaHtml } from "../src/markdown/fixtures";

const applied = (node: JSONContent): JSONContent => node.type === "codeBlock"
  ? { ...node, content: node.content?.map(text => ({ ...text, text: applyLoomaCodeNotation(text.text ?? "").code })) }
  : node.content ? { ...node, content: node.content.map(applied) } : node;

const editors: Editor[] = [];
const load = (content: string | JSONContent) => {
  const editor = new Editor({ extensions: getDefaultEditorExtensions(), content });
  editors.push(editor);
  return editor;
};
const read = (markdown: string) => load(markdownToEditorDocument(markdown));
afterEach(() => { for (const editor of editors.splice(0)) editor.destroy(); });

describe("LoomaEditor reads and writes the Looma Markdown fixtures", () => {
  describe.each(LOOMA_MARKDOWN_FIXTURES.map(fixture => [`${fixture.feature}/${fixture.name}`, fixture] as const))("%s", (_name, fixture) => {
    // The editor keeps code notation as source; the canonical HTML shows it applied.
    it("saves the canonical HTML", () => {
      expect(normalizeLoomaHtml(load(applied(read(fixture.markdown).getJSON())).getHTML())).toBe(normalizeLoomaHtml(load(fixture.html).getHTML()));
    });

    it("writes the document back byte for byte", () => {
      expect(editorDocumentToMarkdown(read(fixture.markdown).getJSON(), { original: fixture.markdown })).toBe(fixture.markdown);
    });

    it("writes the canonical Markdown", () => {
      expect(editorDocumentToMarkdown(read(fixture.markdown).getJSON())).toBe(fixture.canonical);
    });

    it("reads back what it writes", () => {
      const editor = read(fixture.markdown);
      expect(editorDocumentToExpressmark(read(editorDocumentToMarkdown(editor.getJSON())).getJSON())).toEqual(editorDocumentToExpressmark(editor.getJSON()));
    });
  });
});
