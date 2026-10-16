// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { createChipEditing } from "../src/editor/chip-editing";
import { getDefaultEditorExtensions } from "../src/editor/extensions";

const editors: Editor[] = [];
afterEach(() => editors.splice(0).forEach((editor) => editor.destroy()));

function setup(editable = true) {
  const element = document.body.appendChild(document.createElement("div"));
  const editor = new Editor({
    element,
    extensions: getDefaultEditorExtensions(),
    content: '<p>Status <span data-looma-chip data-label="Draft" data-color="yellow">Draft</span> now</p>',
  });
  editors.push(editor);
  let chipAt = -1;
  editor.state.doc.descendants((node, position) => { if (node.type.name === "loomaChip") chipAt = position; });
  const chips = createChipEditing({ editor, isEditable: () => editable });
  const chip = () => {
    let attrs: Record<string, unknown> | null = null;
    editor.state.doc.descendants((node) => { if (node.type.name === "loomaChip") attrs = node.attrs; });
    return attrs;
  };
  return { editor, chips, chipAt, chip };
}

describe("chip editing", () => {
  it("opens on a chip with its label and tone, and writes each change to that chip as it moves", () => {
    const { editor, chips, chipAt, chip } = setup();
    expect(chips.open(chipAt)).toBe(true);
    expect(chips.state).toEqual({ open: true, label: "Draft", color: "yellow" });
    expect(chips.element?.matches("[data-looma-chip]")).toBe(true);
    editor.commands.insertContentAt(1, "New ");
    chips.setLabel("Ready");
    chips.setColor("green");
    expect(chip()).toMatchObject({ label: "Ready", color: "green" });
    expect(chips.state).toEqual({ open: true, label: "Ready", color: "green" });
    chips.close();
    expect(chips.state.open).toBe(false);
    expect(chips.element).toBeNull();
  });

  it("refuses to open read-only or away from a chip, and closes without writing once the chip is gone", () => {
    const readOnly = setup(false);
    expect(readOnly.chips.open(readOnly.chipAt)).toBe(false);
    const { editor, chips, chipAt, chip } = setup();
    expect(chips.open(1)).toBe(false);
    expect(chips.open(chipAt)).toBe(true);
    editor.commands.setContent("<p>No chips</p>");
    chips.setLabel("Lost");
    expect(chips.state.open).toBe(false);
    expect(chip()).toBeNull();
  });
});
