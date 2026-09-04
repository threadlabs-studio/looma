import { describe, expect, it } from "vitest";
import { Editor, type JSONContent } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import {
  getDefaultEditorExtensions,
  getLoomaTableExtensions,
  handleTableAction,
  handleTableOverlayAction,
  LoomaTableKit,
  setActiveTableCellBackground,
} from "../src/extensions";

describe("editor extension contract", () => {
  const cellText = (row: JSONContent | undefined, column = 0) =>
    row?.content?.[column]?.content?.[0]?.content?.[0]?.text ?? "";

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
