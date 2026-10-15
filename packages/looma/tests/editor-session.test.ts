// @vitest-environment jsdom
import { Editor, type JSONContent } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDefaultEditorExtensions } from "../src/editor/extensions";
import { createEditorSession, selectionSnapshot, type LoomaEditorSession } from "../src/editor/session";

const sessions: LoomaEditorSession[] = [];
afterEach(() => sessions.splice(0).forEach((session) => session.destroy()));

const paragraph = (text: string): JSONContent => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

function open(content: JSONContent = paragraph("Hello world")) {
  const session = createEditorSession({ extensions: getDefaultEditorExtensions(), content });
  sessions.push(session);
  return session;
}

describe("editor session", () => {
  it("moves the view into each attached element and keeps the document and history", () => {
    const session = open();
    const first = document.body.appendChild(document.createElement("div"));
    session.attach(first);
    const view = session.editor.view.dom;
    expect(view.parentElement).toBe(first);
    session.attach(first);
    expect(first.children).toHaveLength(1);

    session.editor.commands.insertContentAt(1, "Say ");
    const second = document.body.appendChild(document.createElement("div"));
    session.attach(second);
    expect(session.editor.view.dom).toBe(view);
    expect(view.parentElement).toBe(second);
    expect(first.children).toHaveLength(0);
    expect(session.editor.getText()).toBe("Say Hello world");
    expect(session.editor.can().undo()).toBe(true);
  });

  it("applies only a changed controlled document", () => {
    const session = open();
    const update = vi.fn();
    session.editor.on("update", update);
    expect(session.setContent(paragraph("Hello world"))).toBe(false);
    expect(session.setContent(paragraph("Replaced"))).toBe(true);
    expect(session.editor.getText()).toBe("Replaced");
    // A controlled document is the host's own value; echoing it back would loop.
    expect(update).not.toHaveBeenCalled();
  });

  it("keeps a focused selection across a controlled replacement, clamped when it no longer fits", () => {
    const session = open();
    session.editor.isFocused = true;
    const focus = vi.spyOn(session.editor.view, "focus").mockImplementation(() => {});
    session.editor.commands.setTextSelection({ from: 2, to: 5 });
    const remembered = selectionSnapshot(session.editor.state.selection);
    expect(remembered).toMatchObject({ from: 2, to: 5, text: true });

    session.editor.commands.setTextSelection(1);
    expect(session.setContent(paragraph("Hello there, world"), remembered)).toBe(true);
    expect(session.editor.state.selection).toBeInstanceOf(TextSelection);
    expect([session.editor.state.selection.from, session.editor.state.selection.to]).toEqual([2, 5]);
    expect(focus).toHaveBeenCalled();

    expect(session.setContent(paragraph("Hi"), { ...remembered, from: 9, to: 12 })).toBe(true);
    const max = session.editor.state.doc.content.size;
    expect([session.editor.state.selection.from, session.editor.state.selection.to]).toEqual([max, max]);
  });

  it("notifies subscribers after each transaction until they unsubscribe", () => {
    const session = open();
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);
    session.editor.commands.insertContentAt(1, "A");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    session.editor.commands.insertContentAt(1, "B");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does nothing once destroyed", () => {
    const session = open();
    session.destroy();
    expect(session.editor.isDestroyed).toBe(true);
    const element = document.createElement("div");
    session.attach(element);
    expect(element.children).toHaveLength(0);
    expect(session.setContent(paragraph("Late"))).toBe(false);
  });

  it("creates the editor from a host's Editor subclass", () => {
    class HostEditor extends Editor {}
    const session = createEditorSession({ extensions: getDefaultEditorExtensions(), content: paragraph("A") }, HostEditor);
    sessions.push(session);
    expect(session.editor).toBeInstanceOf(HostEditor);
  });
});
