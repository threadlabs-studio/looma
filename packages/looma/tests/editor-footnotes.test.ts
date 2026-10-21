// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { getDefaultEditorExtensions, loomaMarkdownFromDoc, loomaMarkdownToHtml } from "../src/editor/extensions";

const editors: Editor[] = [];
const load = (content: string) => {
  const editor = new Editor({ extensions: getDefaultEditorExtensions(), content });
  editors.push(editor);
  return editor;
};
afterEach(() => { for (const editor of editors.splice(0)) editor.destroy(); });

const markdown = "Build[^build] and test[^build], then ship[^ship].\n\n[^build]: Install first.\n\n    Then run it.\n\n[^ship]: Tag a release.";

it("keeps footnotes through its saved HTML and Markdown", () => {
  const editor = load(loomaMarkdownToHtml(markdown));
  const html = editor.getHTML();
  expect(html).toContain('<sup><a href="#fn:build" id="fnref:build:2" data-footnote-ref="" aria-describedby="footnote:label">1</a></sup>');
  expect(html).toContain('<li id="fn:ship"><p>Tag a release.</p></li>');
  const reloaded = load(html);
  expect(reloaded.getJSON()).toEqual(editor.getJSON());
  expect(loomaMarkdownFromDoc(reloaded.state.doc)).toBe(markdown);
});

