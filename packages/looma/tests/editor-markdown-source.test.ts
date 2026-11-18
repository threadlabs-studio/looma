// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor, getSchema } from "@tiptap/core";
import { editorToMarkdown, editorDocumentToMarkdown, editorDocumentToExpressmark, expressmarkToEditorDocument,
  mapEditorMarkdownPositions, markdownToEditorDocument } from "../src/editor/expressmark";
import { getDefaultEditorExtensions } from "../src/editor/extensions";
import { getCompactEditorExtensions } from "../src/editor/compact-extensions";

const editors: Editor[] = [];
afterEach(() => { for (const editor of editors.splice(0)) editor.destroy(); });
const open = (markdown: string, extensions = getDefaultEditorExtensions()) => {
  const editor = new Editor({ extensions, content: markdownToEditorDocument(markdown) });
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

describe("exact Markdown editor positions", () => {
  const sourceDocument = (source: string) => getSchema(getDefaultEditorExtensions()).nodeFromJSON(markdownToEditorDocument(source));

  it("maps the insertion point in a blank writing paragraph", () => {
    const schema = getSchema(getDefaultEditorExtensions());
    const document = schema.node("doc", null, [schema.node("paragraph")]);
    const map = mapEditorMarkdownPositions("", document);
    expect(map.toEditorRange(0, 0)).toEqual({ start: 1, end: 1 });
    expect(map.toSourceRange(1, 1)).toEqual({ start: 0, end: 0 });
  });

  it.each(["*", "_", "**", "__"])("maps one literal %s emphasis with exact offsets at both delimiters", marker => {
    const source = `# Mara ${marker}kept${marker} the key.\n\nShe kept the other key.`;
    const document = sourceDocument(source);
    const map = mapEditorMarkdownPositions(source, document);
    const start = 7 + marker.length;
    const end = start + 4;
    expect(map.toEditorRange(start, end)).toEqual({ start: 6, end: 10 });
    expect(document.textBetween(6, 10)).toBe("kept");
    expect(map.toSourceRange(6, 10)).toEqual({ start, end });
    expect(map.toSourceRange(6, 6)).toBeUndefined();
    expect(map.toSourceRange(6, 6, "before")).toEqual({ start: 7, end: 7 });
    expect(map.toSourceRange(6, 6, "after")).toEqual({ start, end: start });
    expect(map.toSourceRange(10, 10, "before")).toEqual({ start: end, end });
    expect(map.toSourceRange(10, 10, "after")).toEqual({ start: end + marker.length, end: end + marker.length });
    expect(map.toSourceRange(1, 6)).toEqual({ start: 2, end: 7 });
    expect(map.toSourceRange(10, 14)).toEqual({ start: end + marker.length, end: end + marker.length + 4 });
    expect(map.toEditorRange(7, start)).toBeUndefined();
    if (marker.length === 2) {
      expect(map.toEditorRange(8, 8)).toBeUndefined();
      expect(map.toEditorRange(end + 1, end + 1)).toBeUndefined();
    }
    const other = source.lastIndexOf("kept");
    const repeated = map.toEditorRange(other, other + 4)!;
    expect(repeated.start).toBeGreaterThan(10);
    expect(document.textBetween(repeated.start, repeated.end)).toBe("kept");
    expect(map.toSourceRange(repeated.start, repeated.end)).toEqual({ start: other, end: other + 4 });
    expect(map.toEditorRange(start, other + 4)).toBeUndefined();
  });

  it("preserves source offsets through soft CRLF wraps, explicit hard breaks, and UTF-16 text", () => {
    const source = "Mara 🐈 softly\r\nunder the stairs.  \r\nShe paused.\\\r\nNo sound.\r\n\r\nHeading\r\n=======";
    const document = sourceDocument(source);
    const map = mapEditorMarkdownPositions(source, document);
    const cat = source.indexOf("🐈");
    expect(map.toEditorRange(cat + 1, cat + 1)).toBeUndefined();
    const catRange = map.toEditorRange(cat, cat + 2)!;
    expect(document.textBetween(catRange.start, catRange.end)).toBe("🐈");
    expect(map.toSourceRange(catRange.start + 1, catRange.start + 1)).toBeUndefined();
    for (const phrase of ["under", "paused", "sound", "Heading"]) {
      const start = source.indexOf(phrase);
      const mapped = map.toEditorRange(start, start + phrase.length)!;
      expect(document.textBetween(mapped.start, mapped.end)).toBe(phrase);
      expect(map.toSourceRange(mapped.start, mapped.end)).toEqual({ start, end: start + phrase.length });
    }
    const firstLineBreak = source.indexOf("\r\n");
    expect(map.toEditorRange(firstLineBreak + 1, firstLineBreak + 1)).toBeUndefined();
    expect(document.firstChild?.content.content.filter(node => node.type.name === "hardBreak")).toHaveLength(2);
  });

  it.each([
    "A [link](https://example.com) remains.",
    "One **bold** and one *italic* span.",
    "This *one* and *two* stays unmapped.",
    "This *italic **bold** mix* stays unmapped.",
    "A *soft\nline* remains.",
    "Recall \\* &amp;.",
  ])("keeps unsupported syntax unmapped and maps the next proven paragraph (%s)", block => {
    const source = block + "\n\nExact target.";
    const document = sourceDocument(source);
    const map = mapEditorMarkdownPositions(source, document);
    expect(map.toEditorRange(1, 2)).toBeUndefined();
    const start = source.indexOf("Exact");
    const target = map.toEditorRange(start, start + 5)!;
    expect(document.textBetween(target.start, target.end)).toBe("Exact");
    expect(map.toSourceRange(target.start, target.end)).toEqual({ start, end: start + 5 });
  });

  it("rejects a raw interval whose structure or text no longer matches the editor block", () => {
    const source = "Mara *kept* the key.\n\nShe left.";
    const stale = sourceDocument("Mara *lost* the key.\n\nShe left.");
    expect(mapEditorMarkdownPositions(source, stale).toEditorRange(6, 10)).toBeUndefined();
    const plain = sourceDocument("Mara kept the key.\n\nShe left.");
    expect(mapEditorMarkdownPositions(source, plain).toEditorRange(6, 10)).toBeUndefined();
    const differentShape = sourceDocument("Mara *kept* the key.");
    expect(mapEditorMarkdownPositions(source, differentShape).toEditorRange(6, 10)).toBeUndefined();
  });
});

describe("native Markdown document shapes", () => {
  it.each([
    ["full", getDefaultEditorExtensions],
    ["compact", getCompactEditorExtensions],
  ] as const)("preserves soft and hard breaks when the %s editor reads a text edit", async (_preset, extensions) => {
    const source = "Rain fell over the yellow road.\r\nWater filled the ruts.  \r\nThe carts stopped.\r\n\r\nThe morning came.\r\n";
    const editor = open(source, extensions());
    const text = editor.view.dom.querySelector("p")!.firstChild!;
    text.textContent = text.textContent!.replace("yellow", "gray");
    await vi.waitFor(() => expect(editor.getText()).toContain("gray road"));
    expect(editor.view.dom.querySelector("p")!.querySelectorAll("br")).toHaveLength(1);
    expect(editorToMarkdown(editor, { original: source })).toBe(source.replace("yellow", "gray"));
  });

  it("preserves a soft break inside an edited italic span", async () => {
    const source = "It was *yellow\nwhen they saw it* from the road.\n";
    const editor = open(source);
    const text = editor.view.dom.querySelector("em")!.firstChild!;
    text.textContent = text.textContent!.replace("yellow", "gray");
    await vi.waitFor(() => expect(editor.getText()).toContain("gray"));
    expect(editor.view.dom.querySelector("p br")).toBeNull();
    expect(editorToMarkdown(editor, { original: source })).toBe(source.replace("yellow", "gray"));
  });

  it("keeps a responsive picture inside its heading through editing and export", () => {
    const markdown = '<h1 align="center">\n<picture><source media="(prefers-color-scheme: dark)" srcset="dark.svg 1x, dark-large.svg 2x"><img src="light.svg" alt="Project logo" width="280"></picture>\n</h1>\n\nDescription.';
    const editor = open(markdown);
    editor.state.doc.check();
    const heading = editor.getJSON().content?.[0];
    expect(heading?.type).toBe("heading");
    expect(heading?.attrs?.level).toBe(1);
    expect(heading?.attrs?.align).toBe("center");
    expect(editor.view.dom.querySelector("h1")?.getAttribute("align")).toBe("center");
    expect(heading?.content?.find(node => node.type === "loomaInlineImage")?.attrs).toMatchObject({ src: "light.svg", alt: "Project logo", width: 280, sources: [{ media: "(prefers-color-scheme: dark)", srcset: "dark.svg 1x, dark-large.svg 2x" }] });
    expect(editor.view.dom.querySelector("h1 picture source")?.getAttribute("srcset")).toBe("dark.svg 1x, dark-large.svg 2x");
    expect(editorDocumentToExpressmark(editor.getJSON())).toEqual(editorDocumentToExpressmark(markdownToEditorDocument(markdown)));
    const unchanged = markdownToEditorDocument(editorToMarkdown(editor, { original: markdown }));
    expect(editorDocumentToExpressmark(unchanged)).toEqual(editorDocumentToExpressmark(editor.getJSON()));
    replaceText(editor, "Description.", "Updated description.");
    const restored = new Editor({ extensions: getDefaultEditorExtensions(), content: editor.getHTML() });
    editors.push(restored);
    restored.state.doc.check();
    const written = editorToMarkdown(restored);
    expect(written).toContain("dark-large.svg 2x");
    expect(written).toContain("Updated description.");
    const document = markdownToEditorDocument(written);
    getSchema(getDefaultEditorExtensions()).nodeFromJSON(document).check();
    expect(document.content?.[0]?.type).toBe("heading");
    expect(document.content?.[0]?.attrs?.align).toBe("center");
  });

  it("retains linked inline images beside text without changing image insertion commands", () => {
    const editor = open('Before [![Logo](logo.svg)](https://example.com) after.');
    editor.state.doc.check();
    expect(editor.view.dom.querySelector('p a img')?.getAttribute("alt")).toBe("Logo");
    const inline = editor.getJSON().content?.[0]?.content?.find(node => node.type === "loomaInlineImage");
    expect(inline?.marks).toContainEqual(expect.objectContaining({ type: "link" }));
    editor.commands.setContent({ type: "doc", content: [{ type: "paragraph" }] });
    editor.commands.setImage({ src: "block.svg", alt: "Block" });
    expect(editor.state.doc.firstChild?.type.name).toBe("image");
  });

  it("refuses unsafe image alternatives instead of emitting them or dropping their choice", () => {
    const content = { type: "doc", content: [{ type: "image", attrs: { src: "safe.svg", sources: [{ srcset: "safe.svg 1x, javascript:alert(1) 2x" }] } }] };
    expect(() => editorDocumentToMarkdown(content)).toThrow("Unsafe image source URL");
  });

  it("reads HTML disclosure fragments as editable nested sections and keeps untouched source", () => {
    const markdown = 'Before.\n\n<details open>\n<summary>More</summary>\n\nBody with **formatting**.\n\n<details>\n<summary>Nested</summary>\n\n- One\n- Two\n\n</details>\n\n</details>\n\nAfter.\n';
    const editor = open(markdown);
    editor.state.doc.check();
    expect(editor.getJSON().content?.[1]?.type).toBe("loomaExpand");
    expect(editor.view.dom.querySelectorAll("details")).toHaveLength(2);
    expect(editor.view.dom.querySelector("strong")?.textContent).toBe("formatting");
    expect(editorToMarkdown(editor, { original: markdown })).toBe(markdown);
    replaceText(editor, "After.", "Following.");
    expect(editorToMarkdown(editor, { original: markdown })).toBe(markdown.replace("After.", "Following."));
  });

  it("edits a disclosure body while preserving adjacent authored blocks", () => {
    const markdown = '* Before\n\n<details>\n<summary>More</summary>\n\nInside.\n\n</details>\n\n~~~text\nAfter\n~~~\n';
    const editor = open(markdown);
    replaceText(editor, "Inside.", "Updated inside.");
    const written = editorToMarkdown(editor, { original: markdown });
    expect(written).toContain("* Before");
    expect(written).toContain("~~~text\nAfter\n~~~");
    const restored = markdownToEditorDocument(written);
    getSchema(getDefaultEditorExtensions()).nodeFromJSON(restored).check();
    expect(restored.content?.[1]?.type).toBe("loomaExpand");
    expect(JSON.stringify(restored)).toContain("Updated inside.");
  });

  it("retains an unclosed HTML disclosure through the end of its containing blocks", () => {
    const editor = open('<details><summary>History</summary>\n\nHistorical text.\n\nLast paragraph.');
    editor.state.doc.check();
    expect(editor.getJSON().content).toHaveLength(1);
    expect(editor.getJSON().content?.[0]?.content).toHaveLength(2);
    expect(editor.view.dom.textContent).toContain("Last paragraph.");
  });

  it("keeps an empty imported disclosure editable", () => {
    const editor = open('<details><summary>More</summary></details>');
    editor.state.doc.check();
    expect(editor.getJSON().content?.[0]?.content).toEqual([{ type: "paragraph" }]);
  });

  it("refuses unrepresented application data on either HTML frame", () => {
    for (const attributed of [0, 2]) {
      const body = [
        { type: "html", display: "block" as const, value: "<details><summary>More</summary>" },
        { type: "paragraph", value: "Inside." },
        { type: "html", display: "block" as const, value: "</details>" },
      ].map((node, index) => index === attributed ? { ...node, data: { annotation: "meaningful" } } : node);
      expect(() => expressmarkToEditorDocument({ type: "document", version: 1, body })).toThrow("HTML fragment field data");
    }
  });

  it("keeps line blocks distinct from paragraphs through editing and HTML", () => {
    const markdown = "| First **line**\n| Second line\n\nFollowing paragraph.";
    const editor = open(markdown);
    editor.state.doc.check();
    expect(editor.state.doc.firstChild?.type.name).toBe("loomaLineBlock");
    expect(editor.view.dom.querySelector('[data-type="line-block"] strong')?.textContent).toBe("line");
    replaceText(editor, "Second", "Updated");
    const written = editorToMarkdown(editor);
    expect(written).toContain("| Updated line");
    const restored = new Editor({ extensions: getDefaultEditorExtensions(), content: editor.getHTML() });
    editors.push(restored);
    restored.state.doc.check();
    expect(restored.state.doc.firstChild?.type.name).toBe("loomaLineBlock");
    expect(editorToMarkdown(restored)).toBe(written);
    restored.chain().setTextSelection(1).setParagraph().run();
    expect(restored.state.doc.firstChild?.type.name).toBe("paragraph");
  });

  it("normalizes redundant emphasis without discarding formatted text", () => {
    const markdown = "**Outer **inner** text** and *outer *inner* text*.";
    const editor = open(markdown);
    editor.state.doc.check();
    expect(editor.view.dom.querySelector("strong")?.textContent).toBe("Outer inner text");
    expect(editor.view.dom.querySelector("em")?.textContent).toBe("outer inner text");
    replaceText(editor, "inner", "updated");
    expect(editorToMarkdown(editor)).toContain("updated");
  });

  it("gives blockquote-first list items the editor's required paragraph", () => {
    const content = expressmarkToEditorDocument({ type: "document", version: 1, body: [
      { type: "list", ordered: false, children: [{ type: "listItem", body: [{ type: "blockquote", body: [{ type: "paragraph", value: "Quoted item" }] }] }] },
    ] });
    getSchema(getDefaultEditorExtensions()).nodeFromJSON(content).check();
    const editor = new Editor({ extensions: getDefaultEditorExtensions(), content });
    editors.push(editor);
    expect(editor.view.dom.querySelector("li blockquote")?.textContent).toBe("Quoted item");
    replaceText(editor, "Quoted", "Updated");
    const restored = markdownToEditorDocument(editorToMarkdown(editor));
    getSchema(getDefaultEditorExtensions()).nodeFromJSON(restored).check();
    expect(JSON.stringify(restored)).toContain("Updated item");
  });
});

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
  it("keeps emphasis and links on inline code through the default schema", () => {
    const markdown = "Use **`strong`**, _`emphasis`_, ~~`old`~~ and [`linked`](https://example.com/api).\n";
    const content = markdownToEditorDocument(markdown);
    const schema = getSchema(getDefaultEditorExtensions());
    expect(() => schema.nodeFromJSON(content).check()).not.toThrow();
    const editor = open(markdown);
    expect(editor.view.dom.querySelector("strong code")?.textContent).toBe("strong");
    expect(editor.view.dom.querySelector("a code")?.textContent).toBe("linked");
    expect(editorToMarkdown(editor, { original: markdown })).toBe(markdown);
  });

  it("keeps nested tasks and their supporting blocks through the default schema", () => {
    const markdown = "- [x] Parent task\n  - [ ] Child task\n\n  Supporting paragraph.\n\n  - Supporting item\n";
    const content = markdownToEditorDocument(markdown);
    const schema = getSchema(getDefaultEditorExtensions());
    expect(() => schema.nodeFromJSON(content).check()).not.toThrow();
    const editor = open(markdown);
    expect(editor.view.dom.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
    expect(editorToMarkdown(editor, { original: markdown })).toBe(markdown);
  });

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
