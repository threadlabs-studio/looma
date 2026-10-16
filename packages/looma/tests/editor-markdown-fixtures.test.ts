// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { getDefaultEditorExtensions, loomaMarkdownFromDoc, loomaMarkdownToHtml } from "../src/editor/extensions";
import { LOOMA_MARKDOWN_FIXTURES } from "../src/markdown/fixtures";

// Features whose canonical Markdown the editor does not write yet: it writes them as HTML or
// drops a part. Each still reads back losslessly unless it is also listed under `LOSSY`.
const WRITES_OTHERWISE = new Set([
  "chips", "code-meta", "figures", "front-matter", "heading-ids", "headings", "image-attributes", "images",
  "mentions", "tables", "tabs", "task-lists", "toc",
]);
// Features whose document changes when the editor writes it and reads it back: custom heading IDs.
const LOSSY = new Set(["heading-ids"]);

const editors: Editor[] = [];
const load = (content: string) => {
  const editor = new Editor({ extensions: getDefaultEditorExtensions(), content });
  editors.push(editor);
  return editor;
};
afterEach(() => { for (const editor of editors.splice(0)) editor.destroy(); });

describe("LoomaEditor reads and writes the Looma Markdown fixtures", () => {
  describe.each(LOOMA_MARKDOWN_FIXTURES.map(fixture => [`${fixture.feature}/${fixture.name}`, fixture] as const))("%s", (_name, fixture) => {
    it("reads the Markdown as it reads the canonical HTML", () => {
      expect(load(loomaMarkdownToHtml(fixture.markdown)).getJSON()).toEqual(load(fixture.html).getJSON());
    });

    it.skipIf(WRITES_OTHERWISE.has(fixture.feature))("writes the canonical Markdown", () => {
      expect(loomaMarkdownFromDoc(load(loomaMarkdownToHtml(fixture.markdown)).state.doc)).toBe(fixture.canonical.replace(/\n$/, ""));
    });

    it.skipIf(LOSSY.has(fixture.feature))("reads back what it writes", () => {
      const editor = load(loomaMarkdownToHtml(fixture.markdown));
      expect(load(loomaMarkdownToHtml(loomaMarkdownFromDoc(editor.state.doc))).getJSON()).toEqual(editor.getJSON());
    });
  });
});
