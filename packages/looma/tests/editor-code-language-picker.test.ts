// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { codeBlockAtSelection, codeLanguageChoices, codeLanguagePickerPlacement, setCodeBlockLanguage } from "../src/editor/code-language-picker";
import { getDefaultEditorExtensions } from "../src/editor/extensions";

const editors: Editor[] = [];
afterEach(() => editors.splice(0).forEach((editor) => editor.destroy()));

function setup() {
  const element = document.body.appendChild(document.createElement("div"));
  const editor = new Editor({ element, extensions: getDefaultEditorExtensions(), content: '<p>Intro</p><pre><code class="language-sql">select 1</code></pre>' });
  editors.push(editor);
  let pos = -1;
  editor.state.doc.descendants((node, position) => { if (node.type.name === "codeBlock") pos = position; });
  return { editor, pos };
}

describe("code language picker", () => {
  it("finds the code block holding the selection, and nothing elsewhere or across blocks", () => {
    const { editor, pos } = setup();
    editor.commands.setTextSelection(pos + 3);
    expect(codeBlockAtSelection(editor)).toMatchObject({ pos, language: "sql", text: "select 1" });
    editor.commands.setTextSelection(2);
    expect(codeBlockAtSelection(editor)).toBeNull();
    editor.commands.setTextSelection({ from: 2, to: pos + 3 });
    expect(codeBlockAtSelection(editor)).toBeNull();
  });

  it("lists Auto with the detected language, keeps an unavailable saved language, and places itself by the room above", () => {
    expect(codeLanguageChoices("cobol", "sql", ["sql", "css"])).toEqual([
      { value: "auto", label: "Auto (SQL)" },
      { value: "cobol", label: "COBOL (unavailable)" },
      { value: "sql", label: "SQL" },
      { value: "css", label: "CSS" },
    ]);
    expect(codeLanguageChoices("auto", null, ["sql"])[0]).toEqual({ value: "auto", label: "Auto" });
    expect(codeLanguagePickerPlacement(new DOMRect(100, 200, 300, 50))).toEqual({ top: "192px", left: "250px", transform: "translate(-50%, -100%)" });
    expect(codeLanguagePickerPlacement(new DOMRect(100, 40, 300, 50))).toEqual({ top: "98px", left: "250px", transform: "translate(-50%, 0)" });
  });

  it("saves a catalog language as its own undo step, clears it with auto, and refuses others", () => {
    const { editor, pos } = setup();
    expect(setCodeBlockLanguage(editor, pos, "css", ["sql", "css"])).toBe(true);
    expect(editor.state.doc.nodeAt(pos)?.attrs.language).toBe("css");
    expect(setCodeBlockLanguage(editor, pos, "auto", ["sql", "css"])).toBe(true);
    expect(editor.state.doc.nodeAt(pos)?.attrs.language).toBeNull();
    editor.commands.undo();
    expect(editor.state.doc.nodeAt(pos)?.attrs.language).toBe("css");
    expect(setCodeBlockLanguage(editor, pos, "cobol", ["sql", "css"])).toBe(false);
    expect(setCodeBlockLanguage(editor, 0, "sql", ["sql", "css"])).toBe(false);
  });
});
