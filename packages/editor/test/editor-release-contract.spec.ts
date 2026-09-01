import axe from "axe-core";
import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";

import "../src/index";
import {
  getDefaultEditorExtensions,
  handleTableOverlayAction,
} from "../src/extensions";

const editors: Editor[] = [];

afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor.destroy();
  }
  document.body.innerHTML = "";
});

function createTableEditor(): Editor {
  const element = document.createElement("div");
  document.body.append(element);
  const editor = new Editor({
    element,
    extensions: getDefaultEditorExtensions(),
    content: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Before table" }] },
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Name" }] }] },
                { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Status" }] }] },
              ],
            },
            {
              type: "tableRow",
              content: [
                { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Knit" }] }] },
                { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Candidate" }] }] },
              ],
            },
          ],
        },
        { type: "paragraph", content: [{ type: "text", text: "After table" }] },
      ],
    },
  });
  editors.push(editor);
  return editor;
}

function selectFirstTableCell(editor: Editor): void {
  let position: number | undefined;
  editor.state.doc.descendants((node, pos) => {
    if (position === undefined && node.isText && node.text === "Name") {
      position = pos;
      return false;
    }
    return true;
  });
  if (position === undefined) {
    throw new Error("table cell not found");
  }
  editor.commands.setTextSelection(position);
}

function tableDimensions(editor: Editor): { rows: number; cols: number } {
  let dimensions = { rows: 0, cols: 0 };
  editor.state.doc.descendants((node) => {
    if (node.type.name === "table") {
      dimensions = {
        rows: node.childCount,
        cols: node.childCount > 0 ? node.child(0).childCount : 0,
      };
      return false;
    }
    return true;
  });
  return dimensions;
}

describe("editor release data-integrity contract", () => {
  it("adds rows and columns without losing existing table or surrounding content", () => {
    const editor = createTableEditor();
    selectFirstTableCell(editor);

    expect(handleTableOverlayAction(editor, { action: "add-row-after", boundaryIndex: 0 })).toBe(true);
    selectFirstTableCell(editor);
    expect(handleTableOverlayAction(editor, { action: "add-column-after", boundaryIndex: 0 })).toBe(true);

    expect(tableDimensions(editor)).toEqual({ rows: 3, cols: 3 });
    expect(editor.getText()).toContain("Before table");
    expect(editor.getText()).toContain("Name");
    expect(editor.getText()).toContain("Status");
    expect(editor.getText()).toContain("Knit");
    expect(editor.getText()).toContain("Candidate");
    expect(editor.getText()).toContain("After table");
    expect(() => JSON.parse(JSON.stringify(editor.getJSON()))).not.toThrow();
  });

  it("emits one explicit destructive intent and never mutates editor state itself", () => {
    const editor = createTableEditor();
    const before = editor.getJSON();
    const menu = document.createElement("ui-editor-table-context-menu");
    menu.setAttribute("open", "");
    menu.setAttribute("can-delete-table", "");
    document.body.append(menu);
    const actions: string[] = [];
    menu.addEventListener("looma-editor-table-action", (event) => {
      actions.push((event as CustomEvent<{ action: string }>).detail.action);
    });

    menu.querySelector<HTMLButtonElement>('[data-action="delete-table"]')?.click();

    expect(actions).toEqual(["delete-table"]);
    expect(editor.getJSON()).toEqual(before);
  });
});

describe("representative editor accessibility", () => {
  it("passes automated checks for toolbar, table menu, grid, and insertion overlay", async () => {
    document.body.innerHTML = `
      <main id="editor-qualification">
        <ui-editor-toolbar><button type="button">Bold</button></ui-editor-toolbar>
        <ui-editor-table-toolbar open can-add-row-after can-add-column-after can-delete-table></ui-editor-table-toolbar>
        <ui-editor-table-context-menu open can-add-row-after can-delete-table></ui-editor-table-context-menu>
        <ui-editor-insert-table-grid open max-rows="3" max-cols="3"></ui-editor-insert-table-grid>
        <ui-editor-table-overlay open rows="2" cols="2"></ui-editor-table-overlay>
      </main>
    `;

    const result = await axe.run(document.getElementById("editor-qualification")!, {
      // jsdom has no canvas implementation, so contrast remains a real-browser/manual gate.
      rules: { "color-contrast": { enabled: false } },
    });
    expect(result.violations, result.violations.map((violation) => violation.id).join(", ")).toEqual([]);
  });
});
