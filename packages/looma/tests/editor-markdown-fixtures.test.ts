// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { Editor, type JSONContent } from "@tiptap/core";
import { getDefaultEditorExtensions, loomaMarkdownFromDoc, loomaMarkdownToHtml } from "../src/editor/extensions";
import { applyLoomaCodeNotation } from "../src/markdown";
import { LOOMA_MARKDOWN_FIXTURES } from "../src/markdown/fixtures";

const applied = (node: JSONContent): JSONContent => node.type === "codeBlock"
  ? { ...node, content: node.content?.map(text => ({ ...text, text: applyLoomaCodeNotation(text.text ?? "").code })) }
  : node.content ? { ...node, content: node.content.map(applied) } : node;

const editors: Editor[] = [];
const load = (content: string) => {
  const editor = new Editor({ extensions: getDefaultEditorExtensions(), content });
  editors.push(editor);
  return editor;
};
afterEach(() => { for (const editor of editors.splice(0)) editor.destroy(); });

describe("LoomaEditor reads and writes the Looma Markdown fixtures", () => {
  describe.each(LOOMA_MARKDOWN_FIXTURES.map(fixture => [`${fixture.feature}/${fixture.name}`, fixture] as const))("%s", (_name, fixture) => {
    // The editor keeps code notation as source; the canonical HTML shows it applied.
    it("reads the Markdown as it reads the canonical HTML", () => {
      expect(applied(load(loomaMarkdownToHtml(fixture.markdown)).getJSON())).toEqual(load(fixture.html).getJSON());
    });

    it("writes the canonical Markdown", () => {
      expect(loomaMarkdownFromDoc(load(loomaMarkdownToHtml(fixture.markdown)).state.doc)).toBe(fixture.canonical.replace(/\n$/, ""));
    });

    it("reads back what it writes", () => {
      const editor = load(loomaMarkdownToHtml(fixture.markdown));
      expect(load(loomaMarkdownToHtml(loomaMarkdownFromDoc(editor.state.doc))).getJSON()).toEqual(editor.getJSON());
    });
  });
});
