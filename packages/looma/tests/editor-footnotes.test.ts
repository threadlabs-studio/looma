// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { getDefaultEditorExtensions, loomaMarkdownFromDoc, loomaMarkdownToHtml } from "../src/editor/extensions";
import { getDefaultSlashCommands } from "../src/editor/extensions/slash-command";
import { LOOMA_MARKDOWN_FIXTURES } from "../src/markdown/fixtures";

const editors: Editor[] = [];
const load = (content: string) => {
  const editor = new Editor({ extensions: getDefaultEditorExtensions(), content });
  editors.push(editor);
  return editor;
};
afterEach(() => { for (const editor of editors.splice(0)) editor.destroy(); });

// Looma Markdown ends each block with a newline; the editor writes none. Nothing else may differ.
const rendered = (markdown: string) => loomaMarkdownToHtml(markdown).replace(/>\n/g, ">");
const saved = (editor: Editor) => editor.getHTML();
const markdownOf = (editor: Editor) => loomaMarkdownFromDoc(editor.state.doc);
const positionOf = (editor: Editor, text: string) => {
  let found = -1;
  editor.state.doc.descendants((node, position) => {
    if (found < 0 && node.isText && node.text!.includes(text)) found = position + node.text!.indexOf(text);
  });
  return found;
};
const paste = (editor: Editor, text: string) => {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: { getData: (type: string) => type === "text/plain" ? text : "" } });
  editor.view.dom.dispatchEvent(event);
};
const referenceAt = (editor: Editor, index: number) => {
  const positions: number[] = [];
  editor.state.doc.descendants((node, position) => { if (node.type.name === "loomaFootnoteReference") positions.push(position); });
  return positions[index];
};

const markdown = "Build[^build] and test[^build], then ship[^ship].\n\n[^build]: Install first.\n\n    Then run it.\n\n[^ship]: Tag a release.";

describe("footnotes in LoomaEditor", () => {
  it("keeps footnotes through its saved HTML and Markdown", () => {
    const editor = load(loomaMarkdownToHtml(markdown));
    const reloaded = load(saved(editor));
    expect(reloaded.getJSON()).toEqual(editor.getJSON());
    expect(markdownOf(reloaded)).toBe(markdown);
  });

  // The blocks fixture's code block differs outside its footnote: the editor marks code `spellcheck="false"`.
  it.each([
    ...LOOMA_MARKDOWN_FIXTURES.filter(fixture => fixture.feature === "footnotes" && fixture.name !== "blocks").map(fixture => [fixture.name, fixture.markdown] as const),
    ["note referring to a later note", "One[^a].\n\n[^a]: See also[^b].\n\n[^b]: The end."],
    ["note ending in a quote", "One[^a] and two[^a].\n\n[^a]: As written:\n\n    > Keep it short."],
    ["formatted note", "One[^a].\n\n[^a]: A **bold**, *italic* and `coded` note."],
  ])("saves the HTML Looma Markdown renders: %s", (_name, source) => {
    expect(saved(load(loomaMarkdownToHtml(source)))).toBe(rendered(source));
  });

  it("numbers notes again on every edit, in the order of their first references", () => {
    const loaded = load(loomaMarkdownToHtml("Alpha[^a] then beta[^b].\n\n[^a]: First.\n\n[^b]: Second."));
    loaded.chain().setTextSelection(positionOf(loaded, "Alpha")).insertContent({ type: "loomaFootnoteReference", attrs: { label: "b" } }).run();
    expect(saved(loaded)).toBe(rendered("[^b]Alpha[^a] then beta[^b].\n\n[^a]: First.\n\n[^b]: Second."));
    loaded.commands.undo();
    expect(saved(loaded)).toBe(rendered("Alpha[^a] then beta[^b].\n\n[^a]: First.\n\n[^b]: Second."));
  });

  it("inserts a footnote with the next free number and moves the caret into its note", () => {
    const editor = load(loomaMarkdownToHtml("Alpha[^1] beta.\n\n[^1]: First."));
    editor.chain().setTextSelection(positionOf(editor, " beta") + 5).insertLoomaFootnote().run();
    editor.commands.insertContent("Second.");
    expect(saved(editor)).toBe(rendered("Alpha[^1] beta[^2].\n\n[^1]: First.\n\n[^2]: Second."));
  });

  it("inserts a footnote ahead of the existing ones, keeping the caret in the new note", () => {
    const editor = load(loomaMarkdownToHtml("Alpha beta[^1].\n\n[^1]: First."));
    editor.chain().setTextSelection(positionOf(editor, "Alpha") + 5).insertLoomaFootnote().run();
    editor.commands.insertContent("New.");
    expect(markdownOf(editor)).toBe("Alpha[^2] beta[^1].\n\n[^2]: New.\n\n[^1]: First.");
    expect(saved(editor)).toBe(rendered(markdownOf(editor)));
  });

  it("offers /footnote, which inserts a footnote", () => {
    const editor = load("<p>Text /</p>");
    const command = getDefaultSlashCommands().find(item => item.id === "footnote")!;
    const range = { from: positionOf(editor, "/"), to: positionOf(editor, "/") + 1 };
    editor.commands.setTextSelection(range.to);
    expect(command.isAvailable?.({ editor, range })).toBe(true);
    command.command({ editor, range });
    editor.commands.insertContent("Note.");
    expect(markdownOf(editor)).toBe("Text [^1]\n\n[^1]: Note.");
  });

  it("removes a note when its last reference is deleted, and restores it when the reference is pasted back", () => {
    const editor = load(loomaMarkdownToHtml("One[^a] and two[^b] and[^b].\n\n[^a]: A.\n\n[^b]: B."));
    const second = referenceAt(editor, 1);
    editor.commands.deleteRange({ from: second, to: second + 1 });
    expect(markdownOf(editor)).toBe("One[^a] and two and[^b].\n\n[^a]: A.\n\n[^b]: B.");
    const first = referenceAt(editor, 0);
    const cut = editor.state.doc.slice(first, first + 1);
    editor.commands.deleteRange({ from: first, to: first + 1 });
    expect(markdownOf(editor)).toBe("One and two and[^b].\n\n[^b]: B.");
    editor.view.dispatch(editor.state.tr.replace(positionOf(editor, " and two"), positionOf(editor, " and two"), cut));
    expect(markdownOf(editor)).toBe("One[^a] and two and[^b].\n\n[^a]: A.\n\n[^b]: B.");
  });

  it("leaves an empty document when everything is deleted", () => {
    const editor = load(loomaMarkdownToHtml("One[^a].\n\n[^a]: A."));
    editor.chain().selectAll().deleteSelection().run();
    expect(saved(editor)).toBe("<p></p>");
    const notesOnly = load(loomaMarkdownToHtml("One[^a].\n\n[^a]: A."));
    notesOnly.commands.deleteRange({ from: 0, to: notesOnly.state.doc.firstChild!.nodeSize });
    expect(saved(notesOnly)).toBe("<p></p>");
  });

  it("drops the notes when the text holding their references goes", () => {
    const editor = load(loomaMarkdownToHtml("One[^a].\n\nTwo.\n\n[^a]: A."));
    editor.commands.deleteRange({ from: 0, to: editor.state.doc.firstChild!.nodeSize });
    expect(saved(editor)).toBe("<p>Two.</p>");
  });

  it("restores a note deleted while references remain", () => {
    const editor = load(loomaMarkdownToHtml("One[^a].\n\n[^a]: A."));
    editor.state.doc.descendants((node, position) => {
      if (node.type.name === "loomaFootnotes") editor.commands.deleteRange({ from: position, to: position + node.nodeSize });
    });
    expect(markdownOf(editor)).toBe("One[^a].\n\n[^a]: A.");
  });

  it("renames a label on the note and every reference", () => {
    const editor = load(loomaMarkdownToHtml("One[^a] two[^a] three[^b].\n\n[^a]: A.\n\n[^b]: B."));
    expect(editor.commands.renameLoomaFootnote("a", "b")).toBe(false);
    expect(editor.commands.renameLoomaFootnote("a", "has space")).toBe(false);
    expect(editor.commands.renameLoomaFootnote("a", "source")).toBe(true);
    expect(markdownOf(editor)).toBe("One[^source] two[^source] three[^b].\n\n[^source]: A.\n\n[^b]: B.");
  });

  it("moves the caret from a reference to its note and back", () => {
    const editor = load(loomaMarkdownToHtml("One[^a] two[^a].\n\n[^a]: The note."));
    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, referenceAt(editor, 1))));
    expect(editor.commands.goToLoomaFootnote()).toBe(true);
    expect(editor.state.selection.from).toBe(positionOf(editor, "The note.") + "The note.".length);
    expect(editor.commands.goToLoomaFootnote()).toBe(true);
    expect(editor.state.selection).toBeInstanceOf(TextSelection);
    expect(editor.state.selection.from).toBe(referenceAt(editor, 0) + 1);
    expect(editor.commands.goToLoomaFootnote()).toBe(true);
    expect(editor.state.selection.from).toBe(positionOf(editor, "The note.") + "The note.".length);
    editor.commands.setTextSelection(1);
    expect(editor.commands.goToLoomaFootnote()).toBe(false);
  });

  it("makes a reference of [^label] typed in the text, with a note for a new label", () => {
    const editor = load(loomaMarkdownToHtml("One[^a].\n\n[^a]: A."));
    editor.commands.setTextSelection(positionOf(editor, "One") + 3);
    for (const character of " two[^a] three[^new]") {
      const { from, to } = editor.state.selection;
      if (!editor.view.someProp("handleTextInput", handle => handle(editor.view, from, to, character, () => editor.state.tr.insertText(character, from, to)))) {
        editor.view.dispatch(editor.state.tr.insertText(character, from, to));
      }
    }
    expect(markdownOf(editor)).toBe("One two[^a] three[^new][^a].\n\n[^a]: A.\n\n[^new]: ");
    expect(editor.state.selection.$from.nodeBefore?.type.name).toBe("loomaFootnoteReference");
  });

  it("makes references of [^label] in pasted text", () => {
    const editor = load(loomaMarkdownToHtml("One[^a].\n\n[^a]: A."));
    editor.commands.setTextSelection(positionOf(editor, "One") + 3);
    paste(editor, " again[^a]");
    expect(markdownOf(editor)).toBe("One again[^a][^a].\n\n[^a]: A.");
  });

  it("reads pasted Markdown footnotes into the document's notes", () => {
    const editor = load(loomaMarkdownToHtml("One[^a].\n\n[^a]: A."));
    editor.commands.setTextSelection(positionOf(editor, "One"));
    paste(editor, "Zero[^z].\n\n[^z]: Z.");
    expect(saved(editor)).toBe(rendered("Zero[^z].One[^a].\n\n[^z]: Z.\n\n[^a]: A."));
  });
});
