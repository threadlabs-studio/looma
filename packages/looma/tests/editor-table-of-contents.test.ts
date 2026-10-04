// @vitest-environment jsdom
import { Editor, type JSONContent } from "@tiptap/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDefaultEditorExtensions, getDefaultSlashCommands, getTableOfContentsEntries } from "../src/editor/extensions";

const editors: Editor[] = [];
function mount(content: string | JSONContent) {
  const element = document.createElement("div");
  document.body.append(element);
  const editor = new Editor({ element, extensions: getDefaultEditorExtensions(), content });
  editors.push(editor);
  return editor;
}
const toc = '<nav data-looma-toc data-format="plain" data-depth="3"></nav>';
afterEach(() => {
  editors.splice(0).forEach(editor => editor.destroy());
  document.body.innerHTML = "";
});

describe("automatic table of contents", () => {
  it("derives the whole document, repairs duplicate anchors, and omits blank headings", async () => {
    const editor = mount(`${toc}<h2>Same</h2><h3>Detail</h3><h2>Same</h2><h1></h1>`);
    await vi.waitFor(() => expect(getTableOfContentsEntries(editor.state.doc)[0]?.id).toBeTruthy());
    const entries = getTableOfContentsEntries(editor.state.doc);
    expect(entries.map(entry => [entry.text, entry.level, entry.depth])).toEqual([
      ["Same", 2, 0], ["Detail", 3, 1], ["Same", 2, 0],
    ]);
    expect(new Set(entries.map(entry => entry.id)).size).toBe(3);
    expect(entries.every(entry => entry.id)).toBe(true);
    editor.commands.setContent(`${toc}<h1 id="shared">First</h1><h2 id="shared">Second</h2>`);
    expect(getTableOfContentsEntries(editor.state.doc).map(entry => entry.id)).toEqual(["shared", "looma-heading-1"]);
  });

  it("updates entries after heading text/level edits, removal, and undo", async () => {
    const editor = mount(`${toc}<h1>Before</h1><h2>Child</h2>`);
    await vi.waitFor(() => expect(getTableOfContentsEntries(editor.state.doc)[0]?.id).toBeTruthy());
    const before = getTableOfContentsEntries(editor.state.doc)[0];
    editor.commands.insertContentAt({ from: before.position + 1, to: before.position + 7 }, "After");
    expect(getTableOfContentsEntries(editor.state.doc)[0]).toMatchObject({ id: before.id, text: "After" });
    expect(editor.view.dom.querySelector("nav")?.textContent).toContain("After");
    const child = getTableOfContentsEntries(editor.state.doc)[1];
    editor.chain().setTextSelection(child.position + 1).setParagraph().run();
    expect(getTableOfContentsEntries(editor.state.doc).map(entry => entry.text)).toEqual(["After"]);
    editor.commands.undo();
    expect(getTableOfContentsEntries(editor.state.doc).map(entry => entry.text)).toEqual(["After", "Child"]);
    editor.commands.undo();
    expect(getTableOfContentsEntries(editor.state.doc).map(entry => entry.text)).toEqual(["Before", "Child"]);
    editor.commands.redo();
    expect(getTableOfContentsEntries(editor.state.doc)[0].text).toBe("After");
  });

  it("keeps anchors with moved headings and gives duplicated headings a fresh anchor", async () => {
    const editor = mount(`${toc}<h1>First</h1><h1>Second</h1>`);
    await vi.waitFor(() => expect(getTableOfContentsEntries(editor.state.doc)[0]?.id).toBeTruthy());
    const first = editor.state.doc.child(1);
    const second = editor.state.doc.child(2);
    editor.view.dispatch(editor.state.tr.delete(1, 1 + first.nodeSize).insert(1 + second.nodeSize, first));
    expect(getTableOfContentsEntries(editor.state.doc).map(entry => [entry.text, entry.id])).toEqual([
      ["Second", second.attrs.id], ["First", first.attrs.id],
    ]);
    editor.commands.insertContentAt(editor.state.doc.content.size, first.toJSON());
    const entries = getTableOfContentsEntries(editor.state.doc);
    expect(new Set(entries.map(entry => entry.id)).size).toBe(3);
  });

  it("serializes configuration and live links, without storing a heading-list copy", async () => {
    const editor = mount('<h1>Top</h1><h2>Child</h2><nav data-looma-toc data-format="numbered" data-depth="1"></nav>');
    await vi.waitFor(() => expect(getTableOfContentsEntries(editor.state.doc)[0]?.id).toBeTruthy());
    const json = editor.getJSON();
    expect(json.content?.[2]).toEqual({ type: "loomaTableOfContents", attrs: { format: "numbered", depth: 1 } });
    const container = document.createElement("div");
    container.innerHTML = editor.getHTML();
    expect(container.querySelector("nav")?.getAttribute("aria-label")).toBe("Table of contents");
    expect(container.querySelectorAll("nav ol a")).toHaveLength(1);
    expect(container.querySelector("nav a")?.getAttribute("href")).toBe(`#${container.querySelector("h1")?.id}`);
    const restored = mount(editor.getHTML());
    expect(restored.getJSON()).toEqual(json);
    expect(restored.state.doc.textContent).toBe("TopChild");
  });

  it("does not mutate headings in documents without a TOC", async () => {
    const editor = mount("<h1>Ordinary</h1>");
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(editor.state.doc.child(0).attrs.id).toBeNull();
  });

  it("undoes TOC insertion and its generated anchors together, then restores them on redo", () => {
    const editor = mount("<p></p><h1>Heading</h1>");
    editor.commands.setTextSelection(1);
    editor.commands.insertLoomaTableOfContents();
    const id = getTableOfContentsEntries(editor.state.doc)[0].id;
    expect(id).toBeTruthy();
    editor.commands.undo();
    expect(editor.state.doc.firstChild?.type.name).toBe("paragraph");
    expect(getTableOfContentsEntries(editor.state.doc)[0].id).toBe("");
    editor.commands.redo();
    expect(editor.state.doc.firstChild?.type.name).toBe("loomaTableOfContents");
    expect(getTableOfContentsEntries(editor.state.doc)[0].id).toBe(id);
  });

  it("adds the TOC slash command and retains the chip inventory with a status alias", () => {
    const commands = getDefaultSlashCommands();
    const command = commands.find(item => item.keywords.includes("toc"));
    expect(command).toBeTruthy();
    const editor = mount("<p>/toc</p><h2>Later</h2>");
    command!.command({ editor, range: { from: 1, to: 5 } });
    expect(editor.state.doc.firstChild?.type.name).toBe("loomaTableOfContents");
    expect(editor.getText()).not.toContain("/toc");
    expect(commands.filter(item => item.keywords.includes("status")).map(item => item.title)).toEqual(["Chip"]);
  });
});
