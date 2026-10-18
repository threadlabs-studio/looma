// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { Editor, type JSONContent } from "@tiptap/core";
import { editorDocumentToExpressmark, editorDocumentToMarkdown, markdownToEditorDocument } from "../src/editor/expressmark";
import { getDefaultEditorExtensions, loomaMarkdownToHtml } from "../src/editor/extensions";
import { LOOMA_MARKDOWN_FIXTURES } from "../src/markdown/fixtures";

const editors: Editor[] = [];
const load = (content: string | JSONContent) => {
  const editor = new Editor({ extensions: getDefaultEditorExtensions(), content });
  editors.push(editor);
  return editor;
};
afterEach(() => { for (const editor of editors.splice(0)) editor.destroy(); });

describe("Expressive Markdown preserves the default editor schema", () => {
  it.each(LOOMA_MARKDOWN_FIXTURES.map(fixture => [`${fixture.feature}/${fixture.name}`, fixture] as const))("exports and restores %s", (_name, fixture) => {
    const original = load(loomaMarkdownToHtml(fixture.markdown));
    const before = editorDocumentToExpressmark(original.getJSON());
    const markdown = editorDocumentToMarkdown(original.getJSON());
    const restored = load(markdownToEditorDocument(markdown));
    const after = editorDocumentToExpressmark(restored.getJSON());
    expect(after).toEqual(before);
  });
});
