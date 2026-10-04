// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLoomaSlashCommandExtension, filterLoomaSlashCommands, getDefaultEditorExtensions, getDefaultSlashCommands, type LoomaSlashCommand, type LoomaSlashMenuSnapshot } from "../src/editor/extensions";

const editors: Editor[] = [];
function mount(commands: LoomaSlashCommand[], publish: (snapshot: LoomaSlashMenuSnapshot) => void, content = "<p></p>") {
  const editor = new Editor({ extensions: [...getDefaultEditorExtensions(), createLoomaSlashCommandExtension({ commands, onStateChange: publish })], content });
  editors.push(editor);
  return editor;
}
afterEach(() => editors.splice(0).forEach(editor => editor.destroy()));

describe("slash discovery", () => {
  it("ranks exact aliases before substrings and callouts before the legacy quote alias", () => {
    const commands = getDefaultSlashCommands();
    expect(filterLoomaSlashCommands(commands, "callout").map(item => item.title)).toEqual(["Info", "Note", "Warning", "Blockquote"]);
    expect(filterLoomaSlashCommands(commands, "toc")[0]?.id).toBe("table-of-contents");
    expect(filterLoomaSlashCommands(commands, "status").map(item => item.title)).toEqual(["Chip"]);
    const exact: LoomaSlashCommand = { title: "Host", id: "table", description: "", keywords: [], icon: "table", command: vi.fn() };
    expect(filterLoomaSlashCommands([...commands, exact], "table").map(item => item.id)).toEqual(["table", "table", "table-of-contents"]);
    expect(new Set(commands.map(item => item.id)).size).toBe(commands.length);
  });

  it("omits picker commands without capabilities and unavailable custom commands without editing text", () => {
    expect(getDefaultSlashCommands().map(item => item.title)).not.toContain("Image");
    expect(getDefaultSlashCommands().map(item => item.title)).not.toContain("Link");
    expect(getDefaultSlashCommands(vi.fn(), undefined, vi.fn()).map(item => item.title)).toEqual(expect.arrayContaining(["Image", "Link"]));
    const editor = mount([], () => {}, "<p>/host</p>");
    const unavailable: LoomaSlashCommand = { title: "Host", description: "", icon: "tag", keywords: [], command: vi.fn(), isAvailable: () => false };
    const failed = { ...unavailable, isAvailable: () => { throw new Error("No capability"); } };
    const before = editor.getJSON();
    expect(filterLoomaSlashCommands([unavailable, failed], "host", { editor, range: { from: 1, to: 6 } })).toEqual([]);
    expect(editor.getJSON()).toEqual(before);
    expect(filterLoomaSlashCommands(getDefaultSlashCommands(), "", { editor, range: { from: 1, to: 6 } }).length).toBeGreaterThan(10);
    expect(filterLoomaSlashCommands(getDefaultSlashCommands(), "expand", { editor, range: { from: 1, to: 6 } }).map(item => item.title)).toEqual(["Expand"]);
    expect(editor.getJSON()).toEqual(before);
  });

  it("honors an explicitly empty inventory while publishing an active no-results snapshot", async () => {
    let snapshot: LoomaSlashMenuSnapshot | undefined;
    const editor = mount([], value => { snapshot = value; });
    editor.commands.insertContent("/unknown");
    await vi.waitFor(() => expect(snapshot?.active).toBe(true));
    expect(snapshot?.items).toEqual([]);
    expect(snapshot?.query).toBe("unknown");
    snapshot?.select?.(0);
    expect(editor.getText()).toBe("/unknown");
  });

  it("invalidates old snapshots and rechecks capability before executing a current command", async () => {
    let snapshot: LoomaSlashMenuSnapshot | undefined;
    let available = true;
    const command = vi.fn();
    const host: LoomaSlashCommand = { id: "host", title: "Host", description: "", icon: "tag", keywords: ["h"], command, isAvailable: () => available };
    const editor = mount([host], value => { snapshot = value; });
    editor.commands.insertContent("/");
    await vi.waitFor(() => expect(snapshot?.active).toBe(true));
    const stale = snapshot!;
    editor.commands.insertContent("h");
    await vi.waitFor(() => expect(snapshot?.query).toBe("h"));
    stale.select?.(0);
    expect(command).not.toHaveBeenCalled();
    available = false;
    snapshot?.select?.(0);
    expect(command).not.toHaveBeenCalled();
    expect(editor.getText()).toBe("/h");
    available = true;
    snapshot?.select?.(0);
    expect(command).toHaveBeenCalledOnce();
    expect(command.mock.calls[0][0].range).toEqual({ from: 1, to: 3 });
  });

  it("does not offer slash actions in literal code", async () => {
    const publish = vi.fn();
    const editor = mount(getDefaultSlashCommands(), publish, "<pre><code></code></pre>");
    editor.commands.insertContent("/toc");
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(publish.mock.calls.some(([snapshot]) => snapshot.active)).toBe(false);
    expect(editor.getText()).toBe("/toc");
  });

  it("omits commands unsupported by a smaller host schema without removing its query", () => {
    const editor = new Editor({ extensions: [Document, Paragraph, Text], content: "<p>/</p>" });
    editors.push(editor);
    expect(filterLoomaSlashCommands(getDefaultSlashCommands(), "", { editor, range: { from: 1, to: 2 } }).map(item => item.title)).toEqual(["Text"]);
    expect(editor.getText()).toBe("/");
  });

  it("dismisses without editing and allows a new query to reopen suggestions", async () => {
    let snapshot: LoomaSlashMenuSnapshot | undefined;
    const editor = mount(getDefaultSlashCommands(), value => { snapshot = value; });
    editor.commands.insertContent("/");
    await vi.waitFor(() => expect(snapshot?.active).toBe(true));
    const stale = snapshot!;
    editor.commands.dismissLoomaSlashMenu();
    expect(snapshot?.active).toBe(false);
    stale.select?.(0);
    expect(editor.getText()).toBe("/");
    editor.commands.insertContent("toc");
    await vi.waitFor(() => expect(snapshot?.items[0]?.id).toBe("table-of-contents"));
  });
});
