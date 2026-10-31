// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { createCompactEditorSession } from "../src/editor/compact";

const sessions: ReturnType<typeof createCompactEditorSession>[] = [];
afterEach(() => { sessions.splice(0).forEach(session => session.destroy()); document.body.replaceChildren(); });

it("preserves the native textbox name, identity and content when controlled props change", () => {
  const element = document.body.appendChild(document.createElement("div"));
  const content = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
  const session = createCompactEditorSession(element, { content: content("Before"), label: "Writing", id: "message", editable: true }, [], () => {});
  sessions.push(session);
  expect(session.editor.view.dom.getAttribute("aria-label")).toBe("Writing");
  expect(session.editor.view.dom.id).toBe("message");
  session.update({ content: content("After"), label: "Notes", id: "notes", editable: false });
  expect(session.editor.getText()).toBe("After");
  expect(session.editor.view.dom.getAttribute("aria-label")).toBe("Notes");
  expect(session.editor.view.dom.id).toBe("notes");
  expect(session.editor.view.dom.getAttribute("aria-readonly")).toBe("true");
});
