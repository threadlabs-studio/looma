// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { getDefaultEditorExtensions } from "../src/editor/extensions";

const editors: Editor[] = [];
function mount(content: string) {
  const editor = new Editor({ extensions: getDefaultEditorExtensions(), content });
  editors.push(editor);
  return editor;
}
afterEach(() => editors.splice(0).forEach(editor => editor.destroy()));

describe("durable image formatting", () => {
  it("retains image size and placement through JSON and HTML in the shared preset", () => {
    const editor = mount('<p>Before</p><img src="https://example.test/photo.jpg" alt="Landscape" width="320" height="160" data-placement="wrap-left" data-looma-responsive><p>After</p>');
    expect(editor.getJSON().content?.[1]?.attrs).toMatchObject({ width: 320, height: 160, placement: "wrap-left", responsive: true });
    expect(mount(editor.getHTML()).getJSON()).toEqual(editor.getJSON());
    expect(editor.getHTML()).not.toMatch(/tabindex|role="button"|srcset/);
  });
  it("normalizes unsupported placement and invalid dimensions without dropping the image", () => {
    const editor = mount('<img src="https://example.test/photo.jpg" width="-2" height="0" data-placement="garbage">');
    expect(editor.state.doc.firstChild?.attrs).toMatchObject({ width: null, height: null, placement: "block" });
  });
});


describe("editor Tab input", () => {
  it("inserts a literal tab in text and code, while lists and tables keep their commands", () => {
    const editor = mount('<p>Before</p><ul><li><p>One</p></li><li><p>Two</p></li></ul><table><tr><td>A</td><td>B</td></tr></table><pre><code>code</code></pre>');
    const tab = () => editor.view.dom.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
    editor.commands.setTextSelection(7);
    tab();
    expect(editor.state.doc.firstChild?.textContent).toBe("Before\t");
    let secondItem = 0, firstCell = 0, code = 0;
    editor.state.doc.descendants((node, position) => {
      if (node.type.name === "listItem" && node.textContent === "Two") secondItem = position + 2;
      if (node.type.name === "tableCell" && node.textContent === "A") firstCell = position + 2;
      if (node.type.name === "codeBlock") code = position + 1;
    });
    editor.commands.setTextSelection(secondItem);
    tab();
    expect(editor.state.selection.$from.depth).toBeGreaterThan(3);
    editor.commands.undo();
    editor.commands.setTextSelection(firstCell);
    tab();
    expect(editor.state.selection.$from.parent.textContent).toBe("B");
    editor.commands.setTextSelection(code);
    tab();
    expect(editor.state.selection.$from.parent.textContent).toBe("\tcode");
  });
});
