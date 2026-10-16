// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { getDefaultEditorExtensions } from "../src/editor/extensions";
import { groupRangeActions, rangeActionsAtCaret, selectionActionDetail, selectsPassage } from "../src/editor/host-actions";

const editors: Editor[] = [];
afterEach(() => editors.splice(0).forEach((editor) => editor.destroy()));

function editorWith(html: string) {
  const editor = new Editor({ extensions: getDefaultEditorExtensions(), content: html });
  editors.push(editor);
  return editor;
}

describe("host actions", () => {
  it("offers the range actions around a collapsed caret, ignoring invalid ranges, and groups them by ID", () => {
    const editor = editorWith("<p>One two three</p>");
    const actions = [
      { id: "note", label: "Note", from: 1, to: 4 },
      { id: "note", label: "Note", from: 1, to: 4 },
      { id: "note", label: "Note", from: 2, to: 8 },
      { id: "flag", label: "Flag", from: 3, to: 6 },
      { id: "far", label: "Far", from: 9, to: 12 },
      { id: "bad", label: "Bad", from: 1.5, to: 4 },
      { id: "empty", label: "Empty", from: 3, to: 3 },
      { id: "out", label: "Out", from: 1, to: 999 },
    ];
    editor.commands.setTextSelection(3);
    const atCaret = rangeActionsAtCaret(editor.state, actions);
    expect(atCaret.map(({ id }) => id)).toEqual(["note", "note", "note", "flag"]);
    expect(groupRangeActions(atCaret)).toEqual([
      { id: "note", label: "Note", detail: { id: "note", ranges: [{ from: 1, to: 4 }, { from: 2, to: 8 }] } },
      { id: "flag", label: "Flag", detail: { id: "flag", ranges: [{ from: 3, to: 6 }] } },
    ]);
    editor.commands.setTextSelection({ from: 2, to: 4 });
    expect(rangeActionsAtCaret(editor.state, actions)).toEqual([]);
  });

  it("captures a selected passage with up to 48 characters of context, and nothing for a caret", () => {
    const before = "a".repeat(60);
    const editor = editorWith(`<p>${before}Passage${"b".repeat(60)}</p>`);
    editor.commands.setTextSelection(3);
    expect(selectsPassage(editor.state)).toBe(false);
    expect(selectionActionDetail(editor.state, "quote")).toBeNull();
    editor.commands.setTextSelection({ from: 61, to: 68 });
    expect(selectsPassage(editor.state)).toBe(true);
    expect(selectionActionDetail(editor.state, "quote")).toEqual({
      id: "quote", from: 61, to: 68, text: "Passage", before: "a".repeat(48), after: "b".repeat(48),
    });
    editor.commands.selectAll();
    expect(selectsPassage(editor.state)).toBe(true);
  });
});
