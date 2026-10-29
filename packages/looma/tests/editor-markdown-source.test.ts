// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { editorToMarkdown, markdownToEditorDocument } from "../src/editor/expressmark";
import { getDefaultEditorExtensions } from "../src/editor/extensions";

const editors: Editor[] = [];
afterEach(() => { for (const editor of editors.splice(0)) editor.destroy(); });
const open = (markdown: string) => {
  const editor = new Editor({ extensions: getDefaultEditorExtensions(), content: markdownToEditorDocument(markdown) });
  editors.push(editor);
  return editor;
};
const positionOf = (editor: Editor, text: string) => {
  let found = -1;
  editor.state.doc.descendants((node, position) => {
    if (found < 0 && node.isText && node.text!.includes(text)) found = position + node.text!.indexOf(text);
  });
  if (found < 0) throw new Error(`No text ${text}`);
  return found;
};
const replaceText = (editor: Editor, text: string, replacement: string) => {
  const from = positionOf(editor, text);
  editor.view.dispatch(editor.state.tr.insertText(replacement, from, from + text.length));
};

// Authored spellings a writer would otherwise normalize: setext and closed ATX headings, `_` and
// `__` emphasis, `*` bullets, `)` ordered markers, tilde fences, an alert, every reference link
// form, definitions and notes between other blocks, a TOC placeholder, front matter and spacing.
const source = [
  "---",
  "title: Release notes",
  "---",
  "",
  "Release notes",
  "=============",
  "",
  "::toc{depth=2}",
  "",
  "We ship _often_ and __carefully__[^why], see [the guide][guide], [Docs][] or [Docs].",
  "",
  "[^why]: Small releases are easier to review.",
  "",
  "    They are easier to undo, too.",
  "",
  "## Steps ##",
  "",
  "* Install",
  "* Test",
  "",
  "1) Build",
  "2) Ship",
  "",
  "[guide]: https://example.com/guide \"The guide\"",
  "[docs]: /docs",
  "",
  "> [!WARNING]",
  "> Back up first[^backup].",
  "",
  "~~~sh",
  "pnpm release",
  "~~~",
  "",
  "",
  "Last paragraph.",
  "",
  "[^backup]: Every time.",
  "",
].join("\n");

describe("LoomaEditor writes Markdown back through expressmark", () => {
  it("writes an unedited document back byte for byte", () => {
    const editor = open(source);
    expect(editorToMarkdown(editor, { original: source })).toBe(source);
  });

  it("writes an unedited document back byte for byte after the editor has numbered it", async () => {
    const editor = open(source.replace(/\n/g, "\r\n"));
    await new Promise(resolve => setTimeout(resolve));
    expect(editorToMarkdown(editor, { original: source.replace(/\n/g, "\r\n") })).toBe(source.replace(/\n/g, "\r\n"));
  });

  // Expressmark writes the spacing next to an edited block in its preferred form, one blank line.
  it("keeps every other block's source when one block is edited", () => {
    const editor = open(source);
    replaceText(editor, "Last paragraph.", "The final paragraph.");
    expect(editorToMarkdown(editor, { original: source })).toBe(source.replace("~~~\n\n\nLast paragraph.", "~~~\n\nThe final paragraph."));
  });

  it("keeps the spellings an edited block still reads as", () => {
    const editor = open(source);
    replaceText(editor, "Install", "Install it");
    replaceText(editor, " and ", " and then ");
    expect(editorToMarkdown(editor, { original: source })).toBe(source
      .replace("* Install", "* Install it")
      .replace("_often_ and __carefully__", "_often_ and then __carefully__"));
  });

  it("edits a footnote's note in place and leaves the other notes alone", () => {
    const editor = open(source);
    replaceText(editor, "Every time.", "Every single time.");
    expect(editorToMarkdown(editor, { original: source })).toBe(source.replace("[^backup]: Every time.", "[^backup]: Every single time."));
  });

  it("adds a footnote's note at the end and keeps the existing notes where they are written", () => {
    const editor = open(source);
    editor.chain().setTextSelection(positionOf(editor, "Last paragraph") + "Last paragraph".length).insertLoomaFootnote("later").run();
    editor.commands.insertContent("A later note.");
    expect(editorToMarkdown(editor, { original: source })).toBe(source
      .replace("~~~\n\n\nLast paragraph.", "~~~\n\nLast paragraph[^later].")
      .replace(/\n$/, "\n\n[^later]: A later note.\n"));
  });

  it("removes a note with its last reference", () => {
    const editor = open(source);
    const from = positionOf(editor, "Back up first") + "Back up first".length;
    editor.commands.deleteRange({ from, to: from + 1 });
    expect(editorToMarkdown(editor, { original: source })).toBe(source
      .replace("first[^backup].", "first.")
      .replace("\n\n[^backup]: Every time.\n", "\n"));
  });

  it("keeps reference links and their definitions when the link text changes", () => {
    const editor = open(source);
    replaceText(editor, "the guide", "our guide");
    replaceText(editor, "Docs", "Manual");
    expect(editorToMarkdown(editor, { original: source })).toBe(source
      .replace("[the guide][guide]", "[our guide][guide]")
      // A collapsed reference whose text no longer names its label names it explicitly.
      .replace("[Docs][]", "[Manual][Docs]"));
  });

  it("writes a reference link as an inline link, keeping its title, when its destination changes", () => {
    const editor = open(source);
    const from = positionOf(editor, "the guide");
    editor.chain().setTextSelection({ from, to: from + "the guide".length }).extendMarkRange("link").setLink({ href: "https://example.com/new" }).run();
    expect(editorToMarkdown(editor, { original: source })).toBe(source.replace("[the guide][guide]", '[the guide](https://example.com/new "The guide")'));
  });

  it("keeps the front matter and the document when a heading changes", () => {
    const editor = open(source);
    replaceText(editor, "Steps", "Next steps");
    expect(editorToMarkdown(editor, { original: source })).toBe(source.replace("## Steps ##", "## Next steps ##"));
  });
});
