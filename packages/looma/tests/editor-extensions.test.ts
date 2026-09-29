// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { Editor, type JSONContent } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import {
  createLoomaMentionExtension,
  LOOMA_ACTIVE_BLOCK_BLUR_GRACE_MS,
  LOOMA_ACTIVE_BLOCK_CLASS,
  filterLoomaMentionItems,
  getDefaultEditorExtensions,
  getDefaultSlashCommands,
  getLoomaTableExtensions,
  handleTableAction,
  handleTableOverlayAction,
  LoomaCallout,
  LoomaChip,
  LoomaTable,
  LoomaTableKit,
  setActiveTableCellBackground,
  type LoomaMentionItem,
} from "../src/editor/extensions";

describe("editor extension contract", () => {
  const cellText = (row: JSONContent | undefined, column = 0) =>
    row?.content?.[column]?.content?.[0]?.content?.[0]?.text ?? "";

  const pasteFromSourceEditor = (editor: Editor, text: string, mode?: string, html?: string) => {
    const values = new Map<string, string>([
      ["text/plain", text],
      ["text/html", html ?? (mode ? `<pre>${text}</pre>` : "")],
    ]);
    if (mode) values.set("vscode-editor-data", JSON.stringify({ mode }));
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: { getData: (type: string) => values.get(type) ?? "" },
    });
    editor.view.dom.dispatchEvent(event);
  };

  it("pastes document HTML from a source editor as editable structure", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({
      element,
      extensions: getDefaultEditorExtensions(),
      content: "<p></p>",
    });
    editor.commands.focus("start");

    pasteFromSourceEditor(
      editor,
      "<!doctype html><html><body><h1>Imported title</h1><p>Imported body</p></body></html>",
      "html",
    );

    expect(editor.getJSON().content?.map((node) => node.type)).toEqual(["heading", "paragraph"]);
    expect(editor.getText()).toContain("Imported title");
    expect(editor.getText()).toContain("Imported body");
    editor.destroy();
    element.remove();
  });

  it("treats inline HTML source as document content outside a code block", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({
      element,
      extensions: getDefaultEditorExtensions(),
      content: "<p></p>",
    });
    editor.commands.focus("start");

    pasteFromSourceEditor(editor, "<strong>Imported emphasis</strong>", "html");

    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "paragraph",
      content: [{ type: "text", text: "Imported emphasis", marks: [{ type: "bold" }] }],
    });
    editor.destroy();
    element.remove();
  });

  it("separates adjacent span labels from an HTML layout wrapper", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({ element, extensions: getDefaultEditorExtensions(), content: "<p></p>" });
    editor.commands.focus("start");

    pasteFromSourceEditor(editor,
      '<div class="meta"><span>2026-09-28</span><span>Topic: ERP</span><span>Mode: repo-grounded</span></div>');

    expect(editor.getText()).toBe("2026-09-28 Topic: ERP Mode: repo-grounded");
    expect(editor.getHTML()).not.toMatch(/<(?:div|span)\b/);
    editor.destroy();
    element.remove();
  });

  it("pastes Markdown documents as editable structure", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({
      element,
      extensions: getDefaultEditorExtensions(),
      content: "<p></p>",
    });
    editor.commands.focus("start");

    pasteFromSourceEditor(editor, "# Imported title\n\n- **First**\n- Second");

    expect(editor.getJSON().content?.map((node) => node.type)).toEqual(["heading", "bulletList"]);
    expect(editor.getJSON().content?.[1]?.content?.[0]?.content?.[0]?.content?.[0]?.marks)
      .toEqual([{ type: "bold" }]);
    expect(editor.getText()).toContain("Imported title");
    expect(editor.getText()).toContain("First");
    editor.destroy();
    element.remove();
  });

  it("keeps Markdown frontmatter as source metadata and parses the document after it", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({ element, extensions: getDefaultEditorExtensions(), content: "<p></p>" });
    editor.commands.focus("start");

    pasteFromSourceEditor(editor, "---\ndate: 2026-09-25\ntopic: knowledge\n---\n\n# Working notes\n\n```ts\nconst answer = 42\n```");

    expect(editor.getJSON().content?.map((node) => node.type)).toEqual(["codeBlock", "heading", "codeBlock"]);
    expect(editor.getJSON().content?.[0]).toMatchObject({
      attrs: { language: "yaml" },
      content: [{ text: "---\ndate: 2026-09-25\ntopic: knowledge\n---" }],
    });
    expect(editor.getJSON().content?.[1]).toMatchObject({ attrs: { level: 1 }, content: [{ text: "Working notes" }] });
    expect(editor.getJSON().content?.[2]).toMatchObject({ attrs: { language: "ts" } });
    editor.destroy();
    element.remove();
  });

  it("recognizes frontmatter without a heading but leaves an ordinary divider literal", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({ element, extensions: getDefaultEditorExtensions(), content: "<p></p>" });
    editor.commands.focus("start");

    pasteFromSourceEditor(editor, "---\ntopic: knowledge\n---\nA short note.");
    expect(editor.getJSON().content?.map((node) => node.type)).toEqual(["codeBlock", "paragraph"]);
    editor.commands.clearContent();
    pasteFromSourceEditor(editor, "---\nA short note.\n---");
    expect(editor.getJSON().content?.[0]?.type).not.toBe("codeBlock");
    editor.destroy();
    element.remove();
  });

  it("preserves real rich HTML when its plain-text companion looks like Markdown", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({ element, extensions: getDefaultEditorExtensions(), content: "<p></p>" });
    editor.commands.focus("start");

    pasteFromSourceEditor(editor, "# Heading\nSome text", undefined,
      "<h2><strong># Heading</strong></h2><p>Some <em>text</em></p>");

    expect(editor.getJSON().content).toMatchObject([
      { type: "heading", attrs: { level: 2 }, content: [{ text: "# Heading", marks: [{ type: "bold" }] }] },
      { type: "paragraph", content: [{ text: "Some " }, { text: "text", marks: [{ type: "italic" }] }] },
    ]);
    editor.destroy();
    element.remove();
  });

  it("keeps a native editor paragraph with Markdown-looking text literal", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({ element, extensions: getDefaultEditorExtensions(), content: "<p></p>" });
    editor.commands.focus("start");

    pasteFromSourceEditor(editor, "# Not a heading", undefined,
      '<p data-pm-slice="0 0 []"># Not a heading</p>');

    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "paragraph",
      content: [{ text: "# Not a heading" }],
    });
    editor.destroy();
    element.remove();
  });

  it("pastes Markdown from preformatted clipboard HTML after an old code block is deleted", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({
      element,
      extensions: getDefaultEditorExtensions(),
      content: "<pre><code>Old source</code></pre>",
    });
    editor.commands.selectAll();
    editor.commands.deleteSelection();
    expect(editor.state.selection.$from.parent.type.name).toBe("paragraph");

    const text = "# Working notes\n\n- First item\n- Second item";
    pasteFromSourceEditor(editor, text, undefined, `<pre><code>${text}</code></pre>`);

    expect(editor.getJSON().content?.map((node) => node.type)).toEqual(["heading", "bulletList"]);
    expect(editor.getText()).toContain("Working notes");
    editor.destroy();
    element.remove();
  });

  it("recognizes source inside a styled clipboard wrapper", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({ element, extensions: getDefaultEditorExtensions(), content: "<p></p>" });
    editor.commands.focus("start");

    pasteFromSourceEditor(editor, "# Wrapped source", undefined,
      '<div style="background:#eee"><pre># Wrapped source</pre></div>');

    expect(editor.getJSON().content?.[0]).toMatchObject({ type: "heading", attrs: { level: 1 } });
    editor.destroy();
    element.remove();
  });

  it("detects Markdown document content despite clipboard code-block metadata", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({
      element,
      extensions: getDefaultEditorExtensions(),
      content: "<p></p>",
    });
    editor.commands.focus("start");

    const text = "# Project notes\n\n- First decision\n- Second decision";
    pasteFromSourceEditor(editor, text, undefined, `<pre data-pm-slice="0 0 []"><code>${text}</code></pre>`);

    expect(editor.getJSON().content?.map((node) => node.type)).toEqual(["heading", "bulletList"]);
    editor.destroy();
    element.remove();
  });

  it("detects HTML source content without editor metadata", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({
      element,
      extensions: getDefaultEditorExtensions(),
      content: "<p></p>",
    });
    editor.commands.focus("start");

    pasteFromSourceEditor(editor, "<strong>Important detail</strong>", undefined, "<pre>&lt;strong&gt;Important detail&lt;/strong&gt;</pre>");

    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "paragraph",
      content: [{ type: "text", text: "Important detail", marks: [{ type: "bold" }] }],
    });
    editor.destroy();
    element.remove();
  });

  it("detects Markdown content even when a source editor labels it as code", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({
      element,
      extensions: getDefaultEditorExtensions(),
      content: "<p></p>",
    });
    editor.commands.focus("start");

    pasteFromSourceEditor(editor, "# Imported title\n\n- First item", "javascript");

    expect(editor.getJSON().content?.map((node) => node.type)).toEqual(["heading", "bulletList"]);
    editor.destroy();
    element.remove();
  });

  it("recognizes a single nonempty Markdown heading without editor metadata", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({ element, extensions: getDefaultEditorExtensions(), content: "<p></p>" });
    editor.commands.focus("start");

    pasteFromSourceEditor(editor, "# One clear heading", undefined, "<pre># One clear heading</pre>");

    expect(editor.getJSON().content?.map((node) => node.type)).toEqual(["heading"]);
    editor.destroy();
    element.remove();
  });

  it("does not classify an empty hash line before source code as a Markdown heading", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({ element, extensions: getDefaultEditorExtensions(), content: "<p></p>" });
    editor.commands.focus("start");

    pasteFromSourceEditor(editor, "# \nconst answer = 42;", "javascript");

    expect(editor.getJSON().content?.map((node) => node.type)).toEqual(["codeBlock"]);
    editor.destroy();
    element.remove();
  });

  it("recognizes HTML after a leading comment and whitespace", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({ element, extensions: getDefaultEditorExtensions(), content: "<p></p>" });
    editor.commands.focus("start");

    const text = "  <!-- Source note -->\n<h2>Imported section</h2><p>Readable body</p>";
    pasteFromSourceEditor(editor, text, undefined, `<pre>${text.replace(/</g, "&lt;")}</pre>`);

    expect(editor.getJSON().content?.map((node) => node.type)).toEqual(["heading", "paragraph"]);
    editor.destroy();
    element.remove();
  });

  it("recognizes a prose-led HTML fragment without requiring a tag at the start", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({ element, extensions: getDefaultEditorExtensions(), content: "<p></p>" });
    editor.commands.focus("start");

    pasteFromSourceEditor(editor, "Intro <strong>important</strong> detail.");

    expect(editor.getJSON().content?.[0]?.content).toEqual([
      { type: "text", text: "Intro " },
      { type: "text", text: "important", marks: [{ type: "bold" }] },
      { type: "text", text: " detail." },
    ]);
    editor.destroy();
    element.remove();
  });

  it("does not turn a source-code string containing an HTML tag into document content", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({ element, extensions: getDefaultEditorExtensions(), content: "<p></p>" });
    editor.commands.focus("start");

    const source = 'const template = "<p>Not a document</p>";';
    pasteFromSourceEditor(editor, source, "javascript");

    expect(editor.getJSON().content?.[0]).toMatchObject({ type: "codeBlock" });
    expect(editor.getText()).toContain(source);
    editor.destroy();
    element.remove();
  });

  it("does not classify a bare URL in source code as Markdown", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({ element, extensions: getDefaultEditorExtensions(), content: "<p></p>" });
    editor.commands.focus("start");

    const source = 'const url = "https://example.test/page";';
    pasteFromSourceEditor(editor, source, "javascript");

    expect(editor.getJSON().content?.[0]).toMatchObject({ type: "codeBlock" });
    expect(editor.getText()).toContain(source);
    editor.destroy();
    element.remove();
  });

  it("keeps fenced code and supported raw HTML inside one Markdown document", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({
      element,
      extensions: getDefaultEditorExtensions(),
      content: "<p></p>",
    });
    editor.commands.focus("start");

    const text = [
      "# Mixed guide",
      "",
      "An <strong>important</strong> note.",
      "",
      "```js",
      "const answer = 42;",
      "```",
      "",
      "<p>Raw <em>HTML</em> block.</p>",
      "",
      "<script>alert('not content')</script>",
    ].join("\n");
    const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    pasteFromSourceEditor(editor, text, undefined, `<pre><code>${escaped}</code></pre>`);

    expect(editor.getJSON().content?.map((node) => node.type)).toEqual([
      "heading", "paragraph", "codeBlock", "paragraph",
    ]);
    expect(editor.getHTML()).toContain("<strong>important</strong>");
    expect(editor.getHTML()).toContain("<em>HTML</em>");
    expect(editor.getHTML()).not.toContain("alert(");
    editor.destroy();
    element.remove();
  });

  it("preserves an HTML document's own code block instead of parsing its contents as Markdown", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({ element, extensions: getDefaultEditorExtensions(), content: "<p></p>" });
    editor.commands.focus("start");

    const text = '<h1>Reference</h1>\n<pre><code># sample\n- line\n&lt;span style="display:none"&gt;literal&lt;/span&gt;</code></pre>';
    pasteFromSourceEditor(editor, text, undefined, `<pre>${text.replace(/</g, "&lt;")}</pre>`);

    expect(editor.getJSON().content?.map((node) => node.type)).toEqual(["heading", "codeBlock"]);
    expect(editor.getJSON().content?.[1]?.content?.[0]?.text).toContain("# sample");
    expect(editor.getJSON().content?.[1]?.content?.[0]?.text).toContain('<span style="display:none">literal</span>');
    editor.destroy();
    element.remove();
  });

  it("does not retain executable attributes or URLs from HTML source", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({
      element,
      extensions: getDefaultEditorExtensions(),
      content: "<p></p>",
    });
    editor.commands.focus("start");

    pasteFromSourceEditor(editor, '<p><a href="javascript:alert(1)" onclick="alert(1)">link</a> <img src="javascript:alert(1)" onerror="alert(1)"></p>');

    expect(editor.getHTML()).not.toContain("javascript:");
    expect(editor.getHTML()).not.toContain("onclick");
    expect(editor.getHTML()).not.toContain("onerror");
    editor.destroy();
    element.remove();
  });

  it("omits source HTML with inline display none while retaining visible wrapper text", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({ element, extensions: getDefaultEditorExtensions(), content: "<p></p>" });
    editor.commands.focus("start");

    pasteFromSourceEditor(editor,
      '<div><span>Keep </span><span style="display:none"><strong>hidden one</strong></span>'
      + '<span style="display    :    none">hidden two</span><span>this</span></div>');

    expect(editor.getJSON().content).toEqual([{
      type: "paragraph",
      content: [{ type: "text", text: "Keep this" }],
    }]);
    expect(editor.getHTML()).not.toMatch(/<(?:div|span)\b/);
    editor.destroy();
    element.remove();
  });

  it("does not paste or delete a selection when all source HTML is display none", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const editor = new Editor({ element, extensions: getDefaultEditorExtensions(), content: "<p>Keep me</p>" });

    for (const source of [
      '<p style="display:none">Hidden paragraph</p>',
      '<body style="display : none"><p>Hidden body</p></body>',
    ]) {
      editor.commands.selectAll();
      pasteFromSourceEditor(editor, source);
      expect(editor.getText()).toBe("Keep me");
    }

    editor.destroy();
    element.remove();
  });

  it("keeps recognizable source code and explicit code-block paste literal", () => {
    const sourceElement = document.createElement("div");
    document.body.append(sourceElement);
    const sourceEditor = new Editor({
      element: sourceElement,
      extensions: getDefaultEditorExtensions(),
      content: "<p></p>",
    });
    sourceEditor.commands.focus("start");
    pasteFromSourceEditor(sourceEditor, "const answer = 42;", "javascript");
    expect(sourceEditor.getJSON().content?.[0]).toMatchObject({
      type: "codeBlock",
      attrs: { language: "javascript" },
    });

    const codeElement = document.createElement("div");
    document.body.append(codeElement);
    const codeEditor = new Editor({
      element: codeElement,
      extensions: getDefaultEditorExtensions(),
      content: '<pre><code class="language-html"></code></pre>',
    });
    codeEditor.commands.focus("end");
    pasteFromSourceEditor(codeEditor, "<h1>Literal markup</h1>", "html");
    expect(codeEditor.getJSON().content?.[0]).toMatchObject({ type: "codeBlock" });
    expect(codeEditor.getText()).toContain("<h1>Literal markup</h1>");

    sourceEditor.destroy();
    codeEditor.destroy();
    sourceElement.remove();
    codeElement.remove();
  });

  it("keeps stored highlights but offers no way to create one when highlight is disabled", () => {
    const stored: JSONContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "kept", marks: [{ type: "highlight" }] }] }],
    };
    const mount = (disableHighlight: boolean) => {
      const element = document.createElement("div");
      document.body.append(element);
      return new Editor({ element, extensions: getDefaultEditorExtensions({ disableHighlight }), content: "<p>word</p>" });
    };
    const highlightsAfter = (editor: Editor, act: () => void) => {
      editor.commands.setContent("<p>word</p>");
      act();
      return JSON.stringify(editor.getJSON()).includes('"highlight"');
    };
    const shortcut = (editor: Editor) => () => {
      editor.commands.setTextSelection({ from: 1, to: 5 });
      const mac = /Mac/.test(navigator.platform);
      const event = new KeyboardEvent("keydown", { key: "h", shiftKey: true, ctrlKey: !mac, metaKey: mac });
      editor.view.someProp("handleKeyDown", (handle) => handle(editor.view, event));
    };
    const typed = (editor: Editor) => () => {
      editor.commands.setTextSelection(5);
      editor.commands.insertContent(" ==new=");
      const { from } = editor.state.selection;
      editor.view.someProp("handleTextInput", (handle) => handle(editor.view, from, from, "=", () => editor.state.tr));
    };
    const pasted = (editor: Editor) => () => {
      editor.commands.setTextSelection(5);
      pasteFromSourceEditor(editor, "<p>a <mark>marked</mark> b</p>", undefined, "<p>a <mark>marked</mark> b</p>");
    };

    const editable = mount(false);
    expect(highlightsAfter(editable, shortcut(editable))).toBe(true);
    expect(highlightsAfter(editable, typed(editable))).toBe(true);
    expect(highlightsAfter(editable, pasted(editable))).toBe(true);

    const disabled = mount(true);
    expect(highlightsAfter(disabled, shortcut(disabled))).toBe(false);
    expect(highlightsAfter(disabled, typed(disabled))).toBe(false);
    expect(highlightsAfter(disabled, pasted(disabled))).toBe(false);
    expect(disabled.getText()).toContain("marked");
    disabled.commands.setContent(stored);
    expect(disabled.getJSON()).toEqual(stored);
    expect(disabled.getHTML()).toContain("<mark>kept</mark>");

    editable.destroy();
    disabled.destroy();
    document.body.innerHTML = "";
  });

  it("offers table editing as both a standalone kit and the turnkey preset", () => {
    expect(LoomaTableKit.name).toBe("loomaTableKit");
    expect(getLoomaTableExtensions().map((extension) => extension.name)).toEqual([
      "table",
      "tableRow",
      "tableHeader",
      "tableCell",
    ]);
    expect(getDefaultEditorExtensions().map((extension) => extension.name))
      .toContain("loomaTableKit");
    expect(getDefaultEditorExtensions().map((extension) => extension.name))
      .toContain("loomaCallout");
    expect(LoomaTable.options).toMatchObject({
      resizable: true,
      handleWidth: 3,
      cellMinWidth: 112,
      lastColumnResizable: false,
    });
    expect(getDefaultEditorExtensions({ mention: false }).map((extension) => extension.name))
      .not.toContain("mention");
  });

  it("draws every default slash command's icon", async () => {
    // The slash menu draws each icon with ui-icon, which knows only its catalog: a name missing
    // from it draws an empty box.
    const { icons } = await import("../src/components/shared/icons.js");
    const commands = getDefaultSlashCommands();
    expect(commands.length).toBeGreaterThan(10);
    expect(commands.filter((command) => !(command.icon in icons)).map((command) => command.title)).toEqual([]);
  });

  it("includes durable colored callouts and matching slash commands", () => {
    expect(getDefaultEditorExtensions({ mention: false }).map((extension) => extension.name))
      .toContain("loomaCallout");
    expect(getDefaultSlashCommands().map((command) => command.title))
      .toEqual(expect.arrayContaining(["Info", "Note", "Warning"]));

    for (const [title, tone] of [
      ["Info", "info"],
      ["Note", "note"],
      ["Warning", "warning"],
    ] as const) {
      const editor = new Editor({
        extensions: [Document, Paragraph, Text, LoomaCallout],
        content: `<p>/${tone}</p>`,
      });
      const command = getDefaultSlashCommands().find((item) => item.title === title)!;

      command.command({ editor, range: { from: 1, to: tone.length + 2 } });

      expect(editor.getJSON().content?.[0]).toMatchObject({
        type: "loomaCallout",
        attrs: { tone },
        content: [{ type: "paragraph" }],
      });
      expect(editor.getHTML()).toContain('data-looma-callout=""');
      expect(editor.getHTML()).toContain(`data-tone="${tone}"`);
      expect(editor.getHTML()).not.toContain("aria-label");
      editor.destroy();
    }
  });

  it("round-trips a compact inline chip with its label and palette color", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, LoomaChip],
      content: '<p>Article <span data-looma-chip="" data-label="90% confidence" data-color="blue">90% confidence</span> next</p>',
    });

    expect(editor.getJSON().content?.[0]?.content).toEqual([
      { type: "text", text: "Article " },
      { type: "loomaChip", attrs: { label: "90% confidence", color: "blue" } },
      { type: "text", text: " next" },
    ]);
    expect(editor.getHTML()).toContain('data-label="90% confidence"');
    expect(editor.getHTML()).toContain('data-color="blue"');
    expect(editor.getText()).toContain("90% confidence");
    editor.destroy();
  });

  it("turns selected text into one chip and leaves adjacent prose plain", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, LoomaChip],
      content: "<p>Article draft follows.</p>",
    });

    expect(editor.chain().setTextSelection({ from: 9, to: 14 }).insertLoomaChip().run()).toBe(true);
    expect(editor.getJSON().content?.[0]?.content).toEqual([
      { type: "text", text: "Article " },
      { type: "loomaChip", attrs: { label: "draft", color: "neutral" } },
      { type: "text", text: " follows." },
    ]);
    editor.destroy();
  });

  it("does not infer a chip from an ordinary styled HTML span", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, LoomaChip],
      content: '<p><span class="badge">Article</span></p>',
    });

    expect(editor.getJSON().content?.[0]?.content).toEqual([{ type: "text", text: "Article" }]);
    expect(editor.getHTML()).toBe("<p>Article</p>");
    editor.destroy();
  });

  it("inserts a chip through the slash menu without splitting its paragraph", () => {
    const editor = new Editor({
      extensions: getDefaultEditorExtensions({ mention: false }),
      content: "<p>Article /chip follows.</p>",
    });
    const chip = getDefaultSlashCommands().find((command) => command.title === "Chip")!;

    chip.command({ editor, range: { from: 9, to: 14 } });

    expect(editor.getJSON().content?.map((node) => node.type)).toEqual(["paragraph"]);
    expect(editor.getJSON().content?.[0]?.content?.[1]).toEqual({
      type: "loomaChip",
      attrs: { label: "", color: "neutral" },
    });
    expect(editor.getHTML()).toContain("Set a label");
    editor.destroy();
  });

  it("normalizes unknown palette values and keeps copied chip text", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, LoomaChip],
      content: '<p><span data-looma-chip="" data-color="not-a-color">Copied label</span></p>',
    });

    expect(editor.getJSON().content?.[0]?.content?.[0]).toEqual({
      type: "loomaChip",
      attrs: { label: "Copied label", color: "neutral" },
    });
    editor.destroy();
  });

  it("filters mention candidates by label or detail without persisting display metadata", () => {
    const people: LoomaMentionItem[] = [
      { id: "ada", label: "Ada Lovelace", detail: "ada@example.com", initials: "AL" },
      { id: "grace", label: "Grace Hopper", detail: "grace@example.com", initials: "GH" },
    ];

    expect(filterLoomaMentionItems(people, "LOVE")).toEqual([people[0]]);
    expect(filterLoomaMentionItems(people, "grace@")).toEqual([people[1]]);
    expect(filterLoomaMentionItems(people, "missing")).toEqual([]);

    const largeDirectory = Array.from({ length: 1_000 }, (_, index) => ({
      id: `person-${index}`,
      label: `Person ${index}`,
    }));
    expect(filterLoomaMentionItems(largeDirectory, "")).toHaveLength(8);
    expect(filterLoomaMentionItems(largeDirectory, "", 1_000)).toHaveLength(20);
  });

  it("round-trips durable mentions with only a stable id and display label", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, createLoomaMentionExtension()],
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [
            { type: "text", text: "Hello " },
            { type: "mention", attrs: { id: "ada", label: "Ada Lovelace" } },
          ],
        }],
      },
    });

    expect(editor.getJSON().content?.[0]?.content?.[1]).toEqual({
      type: "mention",
      attrs: { id: "ada", label: "Ada Lovelace" },
    });
    expect(editor.getHTML()).toContain('data-id="ada"');
    expect(editor.getHTML()).toContain("@Ada Lovelace");
    editor.destroy();
  });

  it("persists, parses, and serializes semantic Looma callout tones", () => {
    const editor = new Editor({
      extensions: getDefaultEditorExtensions(),
      content: '<aside data-looma-callout data-tone="warning"><p>Review this.</p></aside>',
    });

    expect(editor.getJSON()).toMatchObject({
      type: "doc",
      content: [{ type: "loomaCallout", attrs: { tone: "warning" } }],
    });
    expect(editor.getHTML()).toContain('data-looma-callout=""');
    expect(editor.getHTML()).toContain('data-tone="warning"');
    expect(editor.getHTML()).toContain('<p>Review this.</p>');

    expect(editor.commands.setLoomaCallout("note")).toBe(true);
    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "loomaCallout",
      attrs: { tone: "note" },
    });
    editor.destroy();
  });

  it("offers Info, Note, and Warning slash commands that insert callout nodes", () => {
    const commands = getDefaultSlashCommands();
    expect(commands.filter(command => ["Info", "Note", "Warning"].includes(command.title)))
      .toMatchObject([
        { title: "Info", icon: "info" },
        { title: "Note", icon: "notebook-pen" },
        { title: "Warning", icon: "triangle-alert" },
      ]);

    for (const [title, tone] of [["Info", "info"], ["Note", "note"], ["Warning", "warning"]] as const) {
      const editor = new Editor({ extensions: getDefaultEditorExtensions(), content: "<p>/</p>" });
      const command = commands.find(candidate => candidate.title === title)!;
      command.command({ editor, range: { from: 1, to: 2 } });
      expect(editor.getJSON().content?.[0]).toMatchObject({ type: "loomaCallout", attrs: { tone } });
      editor.destroy();
    }
  });

  it("provides working table commands without the complete editor preset", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, LoomaTableKit],
      content: { type: "doc", content: [{ type: "paragraph" }] },
    });

    expect(editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run())
      .toBe(true);
    expect(editor.getJSON().content?.[0]?.content).toHaveLength(2);
    expect(editor.chain().focus().addRowAfter().run()).toBe(true);
    expect(editor.getJSON().content?.[0]?.content).toHaveLength(3);
    expect(setActiveTableCellBackground(editor, "#dbeafe")).toBe(true);
    expect(JSON.stringify(editor.getJSON())).toContain('"backgroundColor":"#dbeafe"');

    editor.destroy();
  });

  it("inserts at the row boundary that the overlay previews", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, LoomaTableKit],
      content: `
        <table><tbody>
          <tr><th>First left</th><th>First right</th></tr>
          <tr><td>Second left</td><td>Second right</td></tr>
        </tbody></table>
      `,
    });

    expect(handleTableOverlayAction(editor, {
      action: "add-row-after",
      boundaryIndex: 1,
    })).toBe(true);

    const rows = editor.getJSON().content?.[0]?.content ?? [];
    expect(rows).toHaveLength(3);
    expect(cellText(rows[0])).toBe("First left");
    expect(cellText(rows[1])).toBe("");
    expect(cellText(rows[2])).toBe("Second left");

    expect(handleTableOverlayAction(editor, {
      action: "add-column-after",
      boundaryIndex: 1,
    })).toBe(true);
    const firstRow = editor.getJSON().content?.[0]?.content?.[0];
    expect(firstRow?.content).toHaveLength(3);
    expect(cellText(firstRow, 0)).toBe("First left");
    expect(cellText(firstRow, 1)).toBe("");
    expect(cellText(firstRow, 2)).toBe("First right");

    editor.destroy();
  });

  it("inserts at logical boundaries inside merged cells", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, LoomaTableKit],
      content: `
        <table><tbody>
          <tr><td colspan="2">Merged</td></tr>
          <tr><td>Left</td><td>Right</td></tr>
        </tbody></table>
      `,
    });

    expect(handleTableOverlayAction(editor, {
      action: "add-column-after",
      boundaryIndex: 1,
    })).toBe(true);

    const table = editor.getJSON().content?.[0];
    expect(table?.content?.[0]?.content?.[0]?.attrs?.colspan).toBe(3);
    expect(table?.content?.[1]?.content).toHaveLength(3);
    editor.destroy();
  });

  it("selects whole rows and columns from contextual handles", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, LoomaTableKit],
      content: "<table><tbody><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></tbody></table>",
    });

    expect(handleTableOverlayAction(editor, {
      action: "select-row",
      rowIndex: 1,
      columnIndex: 0,
    })).toBe(true);
    expect(editor.state.selection.constructor.name).toBe("CellSelection");
    expect(editor.state.selection.ranges).toHaveLength(2);
    expect(handleTableAction(editor, { action: "background-yellow" })).toBe(true);
    const selectedRow = editor.getJSON().content?.[0]?.content?.[1];
    expect(selectedRow?.content?.map((cell) => cell.attrs?.backgroundColor)).toEqual([
      "#fef3c7",
      "#fef3c7",
    ]);

    expect(handleTableOverlayAction(editor, {
      action: "select-column",
      rowIndex: 0,
      columnIndex: 1,
    })).toBe(true);
    expect(editor.state.selection.ranges).toHaveLength(2);
    editor.destroy();
  });

  it("clears selected cell content without deleting table structure", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, LoomaTableKit],
      content: "<table><tbody><tr><td>Keep</td><td>Clear me</td></tr></tbody></table>",
    });

    let clearPosition = 0;
    editor.state.doc.descendants((node, position) => {
      if (node.isText && node.text === "Clear me") clearPosition = position;
    });
    editor.commands.setTextSelection(clearPosition);
    expect(handleTableAction(editor, { action: "clear-cells" })).toBe(true);
    expect(editor.getText()).toContain("Keep");
    expect(editor.getText()).not.toContain("Clear me");
    expect(editor.getJSON().content?.[0]?.content?.[0]?.content).toHaveLength(2);
    editor.destroy();
  });
});

describe("active block marker", () => {
  const mountEditor = () => {
    const element = document.createElement("div");
    document.body.append(element);
    return new Editor({
      element,
      extensions: getDefaultEditorExtensions(),
      content:
        "<p>First paragraph</p><ul><li><p>One</p></li><li><p>Two</p></li></ul>",
    });
  };

  const markedTags = (editor: Editor) =>
    [...editor.view.dom.querySelectorAll(`.${LOOMA_ACTIVE_BLOCK_CLASS}`)].map(
      (node) => node.tagName.toLowerCase()
    );

  const setFocus = (editor: Editor, focused: boolean) => {
    editor.view.dom.dispatchEvent(new Event(focused ? "focus" : "blur"));
  };

  it("marks nothing while the editor is unfocused, so reading shows no chrome", () => {
    const editor = mountEditor();
    editor.commands.setTextSelection(3);

    expect(markedTags(editor)).toEqual([]);

    editor.destroy();
  });

  it("marks exactly the top-level block holding the caret", () => {
    const editor = mountEditor();
    setFocus(editor, true);
    editor.commands.setTextSelection(3);

    expect(markedTags(editor)).toEqual(["p"]);

    editor.destroy();
  });

  // The outermost block is the stable target: marking the list item would make the
  // bar step in and out of the list's inset as the caret moves between items.
  it("marks the list rather than the item when the caret is nested", () => {
    const editor = mountEditor();
    setFocus(editor, true);
    const listStart = editor.state.doc.content.firstChild!.nodeSize + 4;
    editor.commands.setTextSelection(listStart);

    expect(markedTags(editor)).toEqual(["ul"]);

    editor.destroy();
  });

  it("drops the marker once focus has stayed away past the grace period", () => {
    vi.useFakeTimers();
    try {
      const editor = mountEditor();
      setFocus(editor, true);
      editor.commands.setTextSelection(3);
      expect(markedTags(editor)).toHaveLength(1);

      setFocus(editor, false);
      // A blur that might be a toolbar click or a momentary focus hop does not blink it off.
      expect(markedTags(editor)).toHaveLength(1);

      vi.advanceTimersByTime(LOOMA_ACTIVE_BLOCK_BLUR_GRACE_MS);
      expect(markedTags(editor)).toEqual([]);

      editor.destroy();
    } finally {
      vi.useRealTimers();
    }
  });
});
