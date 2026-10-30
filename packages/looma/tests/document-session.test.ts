// @vitest-environment jsdom
import { Extension } from "@tiptap/core";
import { RequestEvent } from "@nextwebwg/html-next/runtime";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDocumentEditorSession, type DocumentEditorProps } from "../src/editor/document-session";

const sessions: ReturnType<typeof createDocumentEditorSession>[] = [];
afterEach(() => { sessions.splice(0).forEach(session => session.destroy()); document.body.replaceChildren(); });
const content = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
function open(settings: { connect?: boolean } = {}) {
  const root = document.body.appendChild(document.createElement("div"));
  const mount = root.appendChild(document.createElement("div"));
  const dispatch = vi.fn(), changed = vi.fn();
  const props: DocumentEditorProps = { content: content("A document"), editable: true, contentDensity: "comfortable", placeholder: "Write", label: "Document", codeLanguages: {}, mentionItems: [], mentionLimit: 8, linkBaseUrl: "", linkTargetLabel: "Item", toolbarMode: "sticky", compactToolbar: false, selectionActions: [], rangeActions: [], toolbarTriggerId: "", toolbarOpen: false, disableHighlight: false };
  const session = createDocumentEditorSession(props, { root, identity: "test", hasResponder: name => RequestEvent.hasResponder(root, name), request: (name, detail, options) => RequestEvent.request(root, name, detail, options), dispatch, changed });
  sessions.push(session);
  session.rendered({ mount });
  if (settings.connect !== false) session.connect();
  return { session, root, mount, dispatch, changed };
}

describe("document editor without a framework", () => {
  it("owns the editor and publishes document changes without echoing controlled content", async () => {
    const { session, mount, dispatch } = open();
    await vi.waitFor(() => expect(session.editor).toBeDefined());
    session.rendered({ mount });
    expect(mount.querySelector('[role="textbox"]')?.getAttribute("aria-label")).toBe("Document");
    expect(session.editor!.getText()).toBe("A document");
    session.editor!.commands.insertContentAt(1, "Edited ");
    expect(dispatch).toHaveBeenCalledWith("change", { content: session.editor!.getJSON() });
    dispatch.mockClear();
    session.update({ content: content("Replacement"), label: "Notes", editable: false });
    await vi.waitFor(() => expect(session.editor!.getText()).toBe("Replacement"));
    expect(session.editor!.isEditable).toBe(false);
    expect(mount.querySelector('[role="textbox"]')?.getAttribute("aria-label")).toBe("Notes");
    expect(mount.querySelector('[role="textbox"]')?.getAttribute("aria-readonly")).toBe("true");
    expect(dispatch.mock.calls.filter(([name]) => name === "change")).toHaveLength(0);
  });

  it("keeps unchanged formatting controls stable while typing and updates active marks", async () => {
    const { session } = open();
    await vi.waitFor(() => expect(session.editor).toBeDefined());
    session.editor!.commands.insertContentAt(1, "First ");
    const tools = session.snapshot().tools;
    session.editor!.commands.insertContentAt(1, "Second ");
    expect(session.snapshot().tools).toBe(tools);
    session.editor!.commands.toggleBold();
    const changed = session.snapshot().tools;
    expect(changed).not.toBe(tools);
    expect(changed.find(tool => tool.label === "Bold")?.active).toBe(true);
  });

  it("does not create a default editor while the component is still resolving its services", async () => {
    const stop = RequestEvent.respond(document.body, "extensions", () => [Extension.create({ name: "earlyConsumer" })]);
    try {
      const { session } = open({ connect: false });
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(session.editor).toBeUndefined();
      session.connect();
      await vi.waitFor(() => expect(session.editor).toBeDefined());
      expect(session.editor!.extensionManager.extensions.some(extension => extension.name === "earlyConsumer")).toBe(true);
    } finally { stop(); }
  });

  it("rebinds selection surfaces when a late extensions responder rebuilds the editor", async () => {
    const { session, root, mount } = open();
    await vi.waitFor(() => expect(session.editor).toBeDefined());
    const linkHome = root.appendChild(document.createElement("div"));
    const imageHome = root.appendChild(document.createElement("div"));
    const linkShell = linkHome.appendChild(document.createElement("div"));
    const imageShell = imageHome.appendChild(document.createElement("div"));
    session.rendered({ mount, linkShell, imageShell });
    const previous = session.editor!;
    const stop = RequestEvent.respond(document.body, "extensions", () => [Extension.create({ name: "lateConsumer" })]);
    try {
      await vi.waitFor(() => expect(session.editor).not.toBe(previous));
      expect((mount.querySelector("[role=textbox]") as HTMLElement & { editor: unknown }).editor).toBe(session.editor);
      expect(previous.isDestroyed).toBe(true);
      const keys = session.editor!.state.plugins.map(plugin => plugin.key);
      expect(keys.filter(key => key.startsWith("looma-link-context-menu$"))).toHaveLength(1);
      expect(keys.filter(key => key.startsWith("looma-image-actions$"))).toHaveLength(1);
    } finally { stop(); }
  });

  it("keeps the editor and undo history when the view is attached to a new mount", async () => {
    const { session, mount } = open();
    await vi.waitFor(() => expect(session.editor).toBeDefined());
    session.rendered({ mount });
    const editor = session.editor!;
    editor.commands.insertContentAt(1, "Retained ");
    const next = document.body.appendChild(document.createElement("div"));
    session.rendered(new Proxy({}, { get: (_target, name) => name === "mount" ? next : undefined }));
    expect(session.editor).toBe(editor);
    expect(next.querySelector(".ProseMirror")).toBe(editor.view.dom);
    expect(editor.can().undo()).toBe(true);
    expect(session.snapshot().tools.some(tool => tool.label === "Undo" && !tool.disabled)).toBe(true);
    session.destroy();
    expect(editor.isDestroyed).toBe(true);
  });
});
