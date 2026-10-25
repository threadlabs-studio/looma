import { describe, expect, it } from "vitest";
import { editorDocumentToExpressmark, expressmarkToEditorDocument, editorDocumentToMarkdown, markdownToEditorDocument } from "../src/editor/expressmark";

describe("Expressive Markdown editor documents", () => {
  it("exports literal punctuation without unnecessary escapes and retains its meaning", () => {
    const literal = "Range [-1, 1]; array[index]; user_id; a@word; a@[Ada]; (@ada).";
    const document = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: literal }] }] };
    const markdown = editorDocumentToMarkdown(document);
    expect(markdown.trim()).toBe(literal);
    expect(markdownToEditorDocument(markdown)).toEqual(document);

    const syntax = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "**literal** @ada [label](./file.md)" }] }] };
    expect(markdownToEditorDocument(editorDocumentToMarkdown(syntax))).toEqual(syntax);
  });

  it("keeps rich semantic content in independent AST fields without a browser", () => {
    const content = { type: "doc", content: [
      { type: "loomaCallout", attrs: { tone: "warning", heading: "Read first" }, content: [
        { type: "paragraph", content: [
          { type: "text", text: "Hello ", marks: [{ type: "bold" }] },
          { type: "mention", attrs: { id: "user-123", label: "Ada" } },
          { type: "loomaChip", attrs: { label: "Ready", color: "green" } },
        ] },
      ] },
    ] };
    const ast = editorDocumentToExpressmark(content);
    expect(ast).toMatchObject({ type: "document", version: 1, body: [{
      type: "container", subType: "warning", title: { type: "title", value: "Read first" },
      body: [{ type: "paragraph", children: [
        { type: "strong", value: "Hello " },
        { type: "inline", subType: "mention", value: "Ada", ref: "user-123" },
        { type: "inline", subType: "chip", value: "Ready", attributes: { tone: "green" } },
      ] }],
    }] });
    expect(expressmarkToEditorDocument(ast)).toEqual(content);
    expect(editorDocumentToExpressmark(markdownToEditorDocument(editorDocumentToMarkdown(content)))).toEqual(ast);
  });

  it("refuses unsupported editor content and names its location", () => {
    expect(() => editorDocumentToExpressmark({ type: "doc", content: [{ type: "diagram", attrs: { source: "retain me" } }] }))
      .toThrow(/diagram.*body\[0\]/);
    expect(() => editorDocumentToExpressmark({ type: "doc", content: [{ type: "paragraph", attrs: { unknownFormatting: "keep" } }] }))
      .toThrow(/unknownFormatting/);
  });

  it("preserves structural spans, rich cells, and authored cell presentation", () => {
    const ast = editorDocumentToExpressmark({ type: "doc", content: [{ type: "table", content: [{ type: "tableRow", content: [{
      type: "tableHeader", attrs: { colspan: 2, rowspan: 1, colwidth: [100, 120], textAlign: "center", backgroundColor: "#ffeeaa" },
      content: [{ type: "paragraph", content: [{ type: "text", text: "Release" }] }],
    }] }] }] });
    expect(ast.body[0]?.children?.[0]?.children?.[0]).toMatchObject({ type: "tableCell", colSpan: 2, header: true, attributes: { columnWidths: "100,120", textAlign: "center", backgroundColor: "#ffeeaa" } });
    expect(expressmarkToEditorDocument(ast).content?.[0]?.content?.[0]?.content?.[0]?.attrs?.colwidth).toEqual([100, 120]);
  });
});

it("materializes table-of-contents links from the document headings", () => {
  const document = editorDocumentToExpressmark({ type: "doc", content: [
    { type: "loomaTableOfContents", attrs: { depth: 3, format: "bulleted" } },
    { type: "heading", attrs: { level: 2, id: "start" }, content: [{ type: "text", text: "Start here" }] },
  ] });
  expect(document.body[0]).toMatchObject({ type: "container", subType: "toc", body: [
    { type: "list", children: [{ type: "listItem", body: [{ type: "paragraph", children: [{ type: "link", url: "#start", value: "Start here" }] }] }] },
  ] });
});

it("excludes headings inside authored TOCs from other generated navigation", () => {
  const doc = editorDocumentToExpressmark({ type: "doc", content: [
    { type: "loomaTableOfContents", attrs: { depth: 3, format: "plain" }, content: [
      { type: "heading", attrs: { level: 1, id: "nav-label" }, content: [{ type: "text", text: "Navigation label" }] },
    ] },
    { type: "loomaTableOfContents", attrs: { depth: 3, format: "bulleted" } },
    { type: "heading", attrs: { level: 2, id: "actual" }, content: [{ type: "text", text: "Actual section" }] },
  ] });
  expect(doc.body[0]?.body?.[0]).toMatchObject({ type: "heading", id: "nav-label", value: "Navigation label" });
  expect(doc.body[1]?.body?.[0]?.children).toHaveLength(1);
  expect(doc.body[1]?.body?.[0]?.children?.[0]?.body?.[0]?.children?.[0]).toMatchObject({ type: "link", url: "#actual", value: "Actual section" });
});

it("keeps authored TOC navigation instead of replacing it with generated links", () => {
  const ast = { type: "document" as const, version: 1 as const, syntax: "compatible" as const, body: [{ type: "container", subType: "toc", attributes: { depth: "2", format: "bulleted" }, body: [{ type: "paragraph", children: [{ type: "link", url: "/other-page", value: "Read next" }] }] }] };
  expect(editorDocumentToExpressmark(expressmarkToEditorDocument(ast))).toEqual(ast);
});

it("writes and reads the shared syntax through the actual converter", () => {
  const source = '::: warning [Deploy carefully]\n\nThanks, @[Ada]#user-123 and :chip[Ready]{tone=green}.\n\n:::\n';
  const editor = markdownToEditorDocument(source);
  const markdown = editorDocumentToMarkdown(editor);
  expect(markdown).toContain("::: warning [Deploy carefully]");
  expect(markdown).toContain("#user-123");
  expect(editorDocumentToExpressmark(markdownToEditorDocument(markdown))).toEqual(editorDocumentToExpressmark(editor));
});

it("preserves authored empty paragraphs through Markdown", () => {
  const editor = { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "Before" }] },
    { type: "paragraph" },
    { type: "paragraph", content: [{ type: "text", text: "After" }] },
  ] };
  expect(editorDocumentToExpressmark(markdownToEditorDocument(editorDocumentToMarkdown(editor))))
    .toEqual(editorDocumentToExpressmark(editor));
});

it("keeps code title and presentation attributes in the existing fence metadata", () => {
  const source = '```ts {title="deploy.ts" & highlight=1,3-4 & show-line-numbers}\nconst one = 1;\nconst two = 2;\nconst three = 3;\nconst four = 4;\n```\n';
  const editor = markdownToEditorDocument(source);
  expect(editor.content?.[0]?.attrs?.meta).toContain("show-line-numbers");
  expect(editorDocumentToExpressmark(editor).body[0]).toMatchObject({ type: "code", title: "deploy.ts", attributes: { highlight: "1,3-4", showLineNumbers: true } });
});

it.each(["1,3-4", "1,3-999999999999999999999"])("translates saved legacy code presentation without expanding range %s", highlight => {
  const editor = { type: "doc", content: [{ type: "codeBlock", attrs: { language: "ts", meta: `title="deploy.ts" {${highlight}} :line-numbers` }, content: [{ type: "text", text: "const one = 1;" }] }] };
  const ast = editorDocumentToExpressmark(editor);
  expect(ast.body[0]).toMatchObject({ type: "code", title: "deploy.ts", attributes: { highlight, showLineNumbers: true } });
  expect(ast.body[0]?.meta).toBeUndefined();
  const markdown = editorDocumentToMarkdown(editor);
  expect(markdown).toContain('title="deploy.ts"');
  expect(markdown).toContain(`highlight="${highlight}"`);
  expect(markdown).toContain("show-line-numbers");
  expect(markdown).not.toMatch(/:line-numbers|\{1,3-/);
  expect(editorDocumentToExpressmark(markdownToEditorDocument(markdown))).toEqual(ast);
});

it("preserves unknown code metadata and keeps default editor code notation literal", () => {
  const value = 'a // [!code highlight:999999999999999999]\nb // [\\!code highlight]';
  const editor = { type: "doc", content: [{ type: "codeBlock", attrs: { language: "ts", meta: 'title="deploy.ts" :no-line-numbers custom="keep {1} :line-numbers"' }, content: [{ type: "text", text: value }] }] };
  const ast = editorDocumentToExpressmark(editor);
  expect(ast.body[0]).toMatchObject({ type: "code", title: "deploy.ts", attributes: { showLineNumbers: false }, meta: 'custom="keep {1} :line-numbers"', value });
  expect(editorDocumentToExpressmark(markdownToEditorDocument(editorDocumentToMarkdown(editor)))).toEqual(ast);
  expect(editor.content[0]?.content[0]?.text).toBe(value);
});

it("removes unsafe HTML through the shared parser rather than storing it in editor content", () => {
  const editor = markdownToEditorDocument('<script>runSomething()</script>\n\nSafe text.');
  expect(editorDocumentToMarkdown(editor)).not.toMatch(/script|runSomething/);
  expect(editorDocumentToMarkdown(editor)).toContain("Safe text.");
});

it("preserves marks applied to inline chips and mentions", () => {
  const editor = { type: "doc", content: [{ type: "paragraph", content: [
    { type: "loomaChip", attrs: { label: "Ready", color: "green" }, marks: [{ type: "bold" }] },
    { type: "mention", attrs: { id: "user-123", label: "Ada" }, marks: [{ type: "italic" }] },
  ] }] };
  expect(markdownToEditorDocument(editorDocumentToMarkdown(editor))).toEqual(editor);
});

it("preserves an explicit hard break between formatted runs", () => {
  const editor = { type: "doc", content: [{ type: "paragraph", content: [
    { type: "text", text: "First", marks: [{ type: "bold" }] }, { type: "hardBreak" }, { type: "text", text: "Second" },
  ] }] };
  expect(editorDocumentToExpressmark(markdownToEditorDocument(editorDocumentToMarkdown(editor)))).toEqual(editorDocumentToExpressmark(editor));
});

it.each(["note", "tip", "info", "important", "warning", "danger"])("keeps the existing editor callout tone %s", tone => {
  const editor = { type: "doc", content: [{ type: "loomaCallout", attrs: { tone, heading: "Keep this meaning" }, content: [{ type: "paragraph", content: [{ type: "text", text: "Body" }] }] }] };
  expect(markdownToEditorDocument(editorDocumentToMarkdown(editor))).toEqual(editor);
});

it('rejects supplied AST URLs and CSS values that the safe HTML policy would discard', () => {
  expect(() => expressmarkToEditorDocument({ type: 'document', version: 1, body: [{ type: 'paragraph', children: [{ type: 'link', url: 'javascript:alert(1)', value: 'Click' }] }] })).toThrow(/navigation URL/)
  expect(() => expressmarkToEditorDocument({ type: 'document', version: 1, body: [{ type: 'table', children: [{ type: 'tableRow', children: [{ type: 'tableCell', value: 'Cell', attributes: { backgroundColor: 'red;position:fixed' } }] }] }] })).toThrow(/table background/)
  expect(() => expressmarkToEditorDocument({ type: 'document', version: 1, body: [{ type: 'table', children: [{ type: 'tableRow', children: [{ type: 'tableCell', value: 'Cell', attributes: { backgroundColor: 'url(https://example.com/pixel)' } }] }] }] })).toThrow(/table background/)
})

it('preserves duplicate authored IDs and keeps materialized TOC links on actual targets', () => {
  const diagnostics: string[] = []
  const editor = { type: 'doc', content: [
    { type: 'loomaTableOfContents', attrs: { depth: 3, format: 'bulleted' } },
    { type: 'heading', attrs: { level: 2, id: 'same' }, content: [{ type: 'text', text: 'First' }] },
    { type: 'heading', attrs: { level: 2, id: 'same' }, content: [{ type: 'text', text: 'Second' }] },
  ] }
  const ast = editorDocumentToExpressmark(editor, { onDiagnostic: diagnostic => diagnostics.push(diagnostic.code) })
  expect(ast.body.slice(1).map(node => node.id)).toEqual(['same', 'same'])
  const links = ast.body[0]?.body?.[0]?.children?.map(item => item.body?.[0]?.children?.[0]?.url)
  expect(links).toEqual(['#same', '#same'])
  expect(diagnostics).toContain('duplicate-id')
  expect(editor.content[1]?.attrs?.id).toBe('same')
})

it('reserves authored IDs before assigning TOC targets to headings that need them', () => {
  const editor = { type: 'doc', content: [
    { type: 'loomaTableOfContents', attrs: { depth: 3, format: 'bulleted' } },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Same' }] },
    { type: 'heading', attrs: { level: 2, id: 'same' }, content: [{ type: 'text', text: 'Custom' }] },
    { type: 'heading', attrs: { level: 2, id: 'same' }, content: [{ type: 'text', text: 'Duplicate' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Same' }] },
  ] }
  const ast = editorDocumentToExpressmark(editor)
  expect(ast.body.slice(1).map(node => node.id)).toEqual(['same-1', 'same', 'same', 'same-2'])
  expect(editor.content[1]?.attrs?.id).toBeUndefined()
})

it('rejects colored highlights that the default schema cannot preserve', () => {
  expect(() => editorDocumentToExpressmark({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Marked', marks: [{ type: 'highlight', attrs: { color: 'red;position:fixed' } }] }] }] })).toThrow(/colored highlight/)
  expect(() => expressmarkToEditorDocument({ type: 'document', version: 1, body: [{ type: 'paragraph', children: [{ type: 'highlight', value: 'Marked', attributes: { color: 'red' } }] }] })).toThrow(/color/)
})
