// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { runBlockAction } from "../src/editor/block-actions";
import { getDefaultEditorExtensions } from "../src/editor/extensions";
import { focusTableOverlayTarget } from "../src/editor/extensions/table-commands";
import { selectedTableCellElement } from "../src/editor/selection-geometry";

const editors: Editor[] = [];
afterEach(() => editors.splice(0).forEach((editor) => editor.destroy()));

function open(html: string) {
  const element = document.body.appendChild(document.createElement("div"));
  const editor = new Editor({ element, extensions: getDefaultEditorExtensions(), content: html });
  editors.push(editor);
  return editor;
}

describe("block actions", () => {
  it("inserts below, duplicates, and deletes the block holding the caret", () => {
    const editor = open("<p>One</p><p>Two</p>");
    editor.commands.setTextSelection(2);
    expect(runBlockAction(editor, "duplicate")).toBe(true);
    expect(editor.getHTML()).toBe("<p>One</p><p>One</p><p>Two</p>");
    expect(runBlockAction(editor, "insert-below")).toBe(true);
    expect(editor.getHTML()).toBe("<p>One</p><p>One</p><p></p><p>Two</p>");
    expect(runBlockAction(editor, "delete")).toBe(true);
    expect(editor.getHTML()).toBe("<p>One</p><p>One</p><p>Two</p>");
  });

  it("leaves an empty paragraph when the only block is deleted, and ignores unknown actions", () => {
    const editor = open("<h2>Title</h2>");
    editor.commands.setTextSelection(2);
    expect(runBlockAction(editor, "archive")).toBe(false);
    expect(runBlockAction(editor, "delete")).toBe(true);
    expect(editor.getHTML()).toBe("<p></p>");
  });
});

describe("table overlay targets", () => {
  const table = (label: string) => `<table><tbody><tr><td><p>${label}1</p></td><td><p>${label}2</p></td></tr><tr><td><p>${label}3</p></td><td><p>${label}4</p></td></tr></tbody></table>`;

  it("moves the caret into the table an overlay action comes from", () => {
    const editor = open(`${table("a")}<p>between</p>${table("b")}`);
    editor.commands.setTextSelection(3);
    const [, second] = [...editor.view.dom.querySelectorAll("table")];
    focusTableOverlayTarget(editor, second!, { action: "select-row", rowIndex: 1, columnIndex: 1 });
    expect(selectedTableCellElement(editor)?.textContent).toBe("b4");
    // The selected table keeps its caret.
    focusTableOverlayTarget(editor, second!, { action: "add-row-after", boundaryIndex: 1 });
    expect(selectedTableCellElement(editor)?.textContent).toBe("b4");
  });

  it("selects a cell menu's cell", () => {
    const editor = open(table("a"));
    editor.commands.setTextSelection(3);
    const element = editor.view.dom.querySelector("table")!;
    focusTableOverlayTarget(editor, element, { action: "open-cell-menu", rowIndex: 1, columnIndex: 0, anchor: { left: 0, top: 0, right: 0, bottom: 0 } });
    expect(selectedTableCellElement(editor)?.textContent).toBe("a3");
  });
});
