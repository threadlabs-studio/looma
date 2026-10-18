// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { afterEach, expect, it, vi } from "vitest";
import { getDefaultEditorExtensions } from "../src/editor/extensions";
import { setReferenceDisplay } from "../src/editor/reference-display";
import { createLinkEditing } from "../src/editor/link-editing";
import { editorDocumentToMarkdown, editorToMarkdown, markdownToEditorDocument } from "../src/editor/expressmark";

const editors: Editor[] = [];
afterEach(() => editors.splice(0).forEach(editor => editor.destroy()));

it("enables mention presentation when cached values first arrive after editor creation", () => {
  const editor = new Editor({ extensions: getDefaultEditorExtensions(), content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "mention", attrs: { id: "person", label: "Saved" } }] }] } }); editors.push(editor);
  editor.commands.insertContent("Author text ");
  const saved = editor.getJSON(), update = vi.fn(); editor.on("update", update);
  setReferenceDisplay(editor, { "mention:person": { label: "Current" } });
  expect(editor.view.dom.textContent).toContain("@Current");
  expect(editor.getJSON()).toEqual(saved); expect(update).not.toHaveBeenCalled();
  expect(editor.commands.undo()).toBe(true);
  expect(editor.view.dom.textContent).toBe("@Current");
});

it("preserves host node views when cached mention values arrive", () => {
  const editor = new Editor({ extensions: getDefaultEditorExtensions(), content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "mention", attrs: { id: "person", label: "Saved" } }] }] } }); editors.push(editor);
  editor.view.setProps({ nodeViews: { mention: () => {
    const dom = document.createElement("span"); dom.textContent = "Host presentation"; return { dom };
  } } });
  expect(editor.view.dom.textContent).toBe("Host presentation");
  const selection = editor.state.selection.toJSON();
  setReferenceDisplay(editor, { "mention:person": { label: "Current" } });
  expect(editor.view.dom.textContent).toBe("Host presentation");
  expect(editor.state.selection.toJSON()).toEqual(selection);
});

it("renders cached reference labels without changing content, history or authored updates", () => {
  const element = document.createElement("div"); document.body.append(element);
  const editor = new Editor({ element, extensions: getDefaultEditorExtensions({ references: {} }), content: {
    type: "doc", content: [{ type: "paragraph", content: [
      { type: "loomaReference", attrs: { id: "guide", kind: "link", href: "/guide", label: "Original" } },
      { type: "text", text: " " },
      { type: "mention", attrs: { id: "person", label: "Original person" } },
      { type: "text", text: "My wording", marks: [{ type: "link", attrs: { href: "/guide" } }] },
    ] }],
  } }); editors.push(editor);
  const before = editor.getJSON(), update = vi.fn(); editor.on("update", update);
  setReferenceDisplay(editor, { "link:guide": { label: "Renamed guide" }, "mention:person": { label: "New name" } });
  expect(element.textContent).toBe("Renamed guide @New nameMy wording");
  expect(editor.getJSON()).toEqual(before);
  expect(editor.getText()).toBe("Renamed guide @New nameMy wording");
  expect(editor.getHTML()).toContain("Renamed guide");
  expect(editor.getHTML()).toContain("@New name");
  const copied = new Editor({ extensions: getDefaultEditorExtensions(), content: editor.getHTML() }); editors.push(copied);
  expect(copied.getJSON().content?.[0]?.content?.[0]).toMatchObject({ type: "loomaReference", attrs: { id: "guide", label: "Renamed guide" } });
  expect(copied.getJSON().content?.[0]?.content?.[0]?.marks).toBeUndefined();
  expect(update).not.toHaveBeenCalled();
  expect(editor.commands.undo()).toBe(false);
  setReferenceDisplay(editor, {});
  expect(element.textContent).toBe("Original @Original personMy wording");
  element.remove();
});

it("never installs an unsafe cached destination or treats a label as markup", () => {
  const element = document.createElement("div"); document.body.append(element);
  const editor = new Editor({ element, extensions: getDefaultEditorExtensions(), content: {
    type: "doc", content: [{ type: "paragraph", content: [{ type: "loomaReference", attrs: { id: "guide", kind: "link", href: "/guide", label: "Guide" } }] }],
  } }); editors.push(editor);
  setReferenceDisplay(editor, { "link:guide": { label: "<img src=x onerror=alert(1)>", href: "javascript:alert(1)" } });
  expect(element.querySelector("a")?.getAttribute("href")).toBe("/guide");
  expect(element.querySelector("a img")).toBeNull();
  expect(element.textContent).toContain("<img");
  element.remove();
});

it("keeps inserted host identity independent from display and preserves custom wording", () => {
  const editor = new Editor({ extensions: getDefaultEditorExtensions(), content: "<p>See .</p>" }); editors.push(editor);
  const resolve = vi.fn(async () => null);
  const links = createLinkEditing({ editor, search: () => async () => [], resolve: () => resolve, baseUrl: () => "", references: () => true });
  links.open(5, 5, "popover"); links.choose({ id: "guide", href: "/guide", label: "Guide" });
  expect(editor.getJSON().content?.[0]?.content?.[1]).toMatchObject({ type: "loomaReference", attrs: { id: "guide", label: "Guide" } });
  const saved = editor.getJSON();
  setReferenceDisplay(editor, { "link:guide": { label: "New guide" } });
  expect(editor.getJSON()).toEqual(saved);
  links.open(5, 6, "popover"); links.setNewTab(true);
  expect(editor.getJSON().content?.[0]?.content?.[1]?.attrs).toMatchObject({ label: "Guide", target: "_blank" });
  expect(editor.getText()).toContain("New guide");
  expect(resolve).not.toHaveBeenCalled();
  links.setText("My wording");
  expect(editor.getJSON().content?.[0]?.content?.[1]).toMatchObject({ type: "text", text: "My wording", marks: [{ type: "link", attrs: { href: "/guide" } }] });
  setReferenceDisplay(editor, { "link:guide": { label: "Another name" } });
  expect(editor.getText()).toContain("My wording");
  links.destroy();
});

it("serializes materialized reference labels and stable targets without changing saved content", () => {
  const content = { type: "doc", content: [{ type: "paragraph", content: [
    { type: "loomaReference", attrs: { id: "guide", kind: "link", href: "/guide", label: "Old guide", target: "_self" } },
    { type: "mention", attrs: { id: "person", label: "Old person" } },
  ] }] };
  const before = structuredClone(content);
  const markdown = editorDocumentToMarkdown(content, { references: { "link:guide": { label: "New guide" }, "mention:person": { label: "New person" } } });
  expect(markdown).toContain("New guide"); expect(markdown).toContain("New person");
  expect(markdownToEditorDocument(markdown).content?.[0]?.content).toMatchObject([
    { type: "loomaReference", attrs: { id: "guide", href: "/guide", label: "New guide" } },
    { type: "mention", attrs: { id: "person", label: "New person" } },
  ]);
  expect(content).toEqual(before);
});

it("uses cached names in live TOCs and serializes their concrete entries", () => {
  const editor = new Editor({ extensions: getDefaultEditorExtensions({ references: {} }), content: {
    type: "doc", content: [{ type: "loomaTableOfContents", attrs: { depth: 3, format: "bulleted" } },
      { type: "heading", attrs: { level: 2, id: "stable" }, content: [{ type: "loomaReference", attrs: { id: "guide", kind: "link", href: "/guide", label: "Original" } }] }],
  } }); editors.push(editor);
  setReferenceDisplay(editor, { "link:guide": { label: "Renamed" } });
  expect(editor.view.dom.querySelector('nav a[href="#stable"]')?.textContent).toBe("Renamed");
  const markdown = editorToMarkdown(editor);
  expect(markdown).toContain('[Renamed](<#stable>)');
  expect(editor.getJSON().content?.[0]?.content).toBeUndefined();
});
