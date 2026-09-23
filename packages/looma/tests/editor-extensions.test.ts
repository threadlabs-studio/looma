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
  LoomaTable,
  LoomaTableKit,
  setActiveTableCellBackground,
  type LoomaMentionItem,
} from "../src/editor/extensions";

describe("editor extension contract", () => {
  const cellText = (row: JSONContent | undefined, column = 0) =>
    row?.content?.[column]?.content?.[0]?.content?.[0]?.text ?? "";

  const pasteFromSourceEditor = (editor: Editor, text: string, mode?: string) => {
    const values = new Map<string, string>([
      ["text/plain", text],
      ["text/html", mode ? `<pre>${text}</pre>` : ""],
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
