// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { getDefaultEditorExtensions, getDefaultSlashCommands, revealLoomaExpandAt } from "../src/editor/extensions";

const editors: Editor[] = [];
function mount(content: string, editable = true) {
  const element = document.createElement("div");
  document.body.append(element);
  const editor = new Editor({ element, extensions: getDefaultEditorExtensions(), content, editable });
  editors.push(editor);
  return editor;
}
afterEach(() => {
  editors.splice(0).forEach(editor => editor.destroy());
  document.body.innerHTML = "";
});

describe("collapsible sections", () => {
  it("round-trips semantic HTML and rich bodies without copying the summary into the body", () => {
    const editor = mount('<details open><summary>More context</summary><p>A <strong>reason</strong></p><ul><li>One</li></ul><pre><code>sample()</code></pre><table><tr><td>Cell</td></tr></table></details>');
    expect(editor.state.doc.firstChild?.attrs).toEqual({ summary: "More context", open: true });
    expect(editor.state.doc.firstChild?.content.content.map(node => node.type.name)).toEqual(["paragraph", "bulletList", "codeBlock", "table"]);
    expect(editor.state.doc.firstChild?.textContent).not.toContain("More context");
    const restored = mount(editor.getHTML());
    expect(restored.getJSON()).toEqual(editor.getJSON());
    expect(editor.getHTML()).toContain('<summary>More context</summary>');
    expect(editor.getHTML()).toContain('<details data-looma-expand="" open="">');
  });

  it("keeps collapsed content, nested summaries, and inline labels in plain text", () => {
    const editor = mount('<details><summary>Outer</summary><p>Hidden <span data-looma-chip data-label="Ready" data-color="green">Ready</span></p><details><summary>Inner</summary><p>Deep content</p></details></details>');
    expect(editor.getText()).toContain("Outer");
    expect(editor.getText()).toContain("Hidden Ready");
    expect(editor.getText()).toContain("Inner");
    expect(editor.getText()).toContain("Deep content");
    expect(mount(editor.getHTML()).getJSON()).toEqual(editor.getJSON());
  });

  it("inserts at the slash, places the caret in its body, and undoes/redoes as one operation", () => {
    const editor = mount("<p>/expand</p><p>After</p>");
    const command = getDefaultSlashCommands().find(item => item.title === "Expand")!;
    command.command({ editor, range: { from: 1, to: 8 } });
    expect(editor.state.doc.firstChild?.type.name).toBe("loomaExpand");
    expect(editor.state.selection.$from.parent.type.name).toBe("paragraph");
    expect(editor.state.selection.$from.node(1).type.name).toBe("loomaExpand");
    editor.commands.insertContent("Body");
    expect(editor.state.doc.firstChild?.textContent).toBe("Body");
    editor.commands.undo();
    expect(editor.getText()).toContain("/expand");
    editor.commands.redo();
    expect(editor.state.doc.firstChild?.textContent).toBe("Body");
  });

  it("can insert within a section and leave the innermost section without losing content", () => {
    const editor = mount('<details><summary>Outer</summary><p>Before</p><p>/expand</p></details>');
    editor.commands.setTextSelection(10);
    expect(editor.commands.insertLoomaExpand({ summary: "Inner" })).toBe(true);
    expect(editor.state.selection.$from.node(2).attrs.summary).toBe("Inner");
    editor.commands.insertContent("Inner body");
    expect(editor.commands.exitLoomaExpand()).toBe(true);
    expect(editor.state.selection.$from.node(1).attrs.summary).toBe("Outer");
    editor.commands.insertContent("Outside inner");
    expect(editor.commands.exitLoomaExpand()).toBe(true);
    expect(editor.state.selection.$from.depth).toBe(1);
    expect(editor.getText()).toContain("Inner body");
    expect(editor.getText()).toContain("Outside inner");
  });

  it("keeps reader toggles and nested navigation transient", async () => {
    const editor = mount('<details><summary>Outer</summary><details><summary>Inner</summary><h2>Destination</h2></details></details>', false);
    const before = editor.getJSON();
    const sections = [...editor.view.dom.querySelectorAll("details")];
    expect(sections.every(section => !section.open)).toBe(true);
    let position = 0;
    editor.state.doc.descendants((node, at) => { if (node.type.name === "heading") position = at + 1; });
    await revealLoomaExpandAt(editor, position);
    expect(sections.every(section => section.open)).toBe(true);
    sections[0].open = false;
    expect(editor.getJSON()).toEqual(before);
    expect(editor.getHTML()).not.toMatch(/<details[^>]* open/);
  });

  it("makes empty imported sections editable and respects the saved default in reader mode", () => {
    const editor = mount('<details><summary>Empty</summary></details>');
    expect(editor.state.doc.firstChild?.firstChild?.type.name).toBe("paragraph");
    const section = editor.view.dom.querySelector("details")!;
    expect(section.open).toBe(true);
    editor.setEditable(false);
    expect(section.open).toBe(false);
    editor.view.dispatch(editor.state.tr.setNodeMarkup(0, undefined, { summary: "Empty", open: true }));
    expect(section.open).toBe(true);
  });

  it("gives the section exit shortcut precedence over the ordinary hard break", () => {
    const editor = mount('<details><summary>Details</summary><p>Body</p></details>');
    editor.commands.setTextSelection(6);
    editor.view.dom.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true, cancelable: true }));
    expect(editor.state.doc.childCount).toBe(2);
    expect(editor.state.doc.child(1).type.name).toBe("paragraph");
    expect(editor.state.selection.$from.depth).toBe(1);
    expect(editor.state.doc.child(0).textContent).toBe("Body");
    const empty = mount("");
    expect(empty.state.doc.firstChild?.type.name).toBe("paragraph");
  });
});
