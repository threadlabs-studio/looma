// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { common } from "lowlight";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCodeHighlighting } from "../src/editor/code-highlighting";
import { autoCodeLanguageNames } from "../src/editor/code-language-catalog";
import { sameDocument, validLinkHref } from "../src/editor/content";
import { getDefaultEditorExtensions } from "../src/editor/extensions";
import { menuAnchorRect, selectedTableCellElement, selectedTableElement } from "../src/editor/selection-geometry";
import { formatEditorShortcut } from "../src/editor/shortcuts";

const editors: Editor[] = [];
afterEach(() => editors.splice(0).forEach((editor) => editor.destroy()));

function mount(content: string, options: Parameters<typeof getDefaultEditorExtensions>[0] = {}) {
  const editor = new Editor({ extensions: getDefaultEditorExtensions(options), content });
  editors.push(editor);
  return editor;
}

describe("editor content checks", () => {
  it("stores site-relative and web links and rejects everything else", () => {
    expect(validLinkHref("  /guides/start ")).toBe("/guides/start");
    expect(validLinkHref("#usage")).toBe("#usage");
    expect(validLinkHref("?tab=api")).toBe("?tab=api");
    expect(validLinkHref("https://example.test/a")).toBe("https://example.test/a");
    expect(validLinkHref("mailto:team@example.test")).toBe("mailto:team@example.test");
    expect(validLinkHref("tel:+15550100")).toBe("tel:+15550100");
    expect(validLinkHref("javascript:alert(1)")).toBeNull();
    expect(validLinkHref("https://example.test/\u0000")).toBeNull();
    expect(validLinkHref("not a url")).toBeNull();
    expect(validLinkHref("   ")).toBeNull();
  });

  it("compares documents by content", () => {
    const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "A" }] }] };
    expect(sameDocument(doc, structuredClone(doc))).toBe(true);
    expect(sameDocument(doc, { type: "doc", content: [] })).toBe(false);
  });
});

describe("editor shortcuts", () => {
  it("writes bindings the way each platform does", () => {
    expect(formatEditorShortcut("Mod-Shift-8", true)).toBe("⇧⌘8");
    expect(formatEditorShortcut("Mod-Shift-8", false)).toBe("Ctrl+Shift+8");
    expect(formatEditorShortcut("Ctrl-Alt-k", true)).toBe("⌃⌥K");
    expect(formatEditorShortcut("Alt-k", false)).toBe("Alt+K");
  });
});

describe("selection geometry", () => {
  it("copies a client rectangle into a plain menu anchor", () => {
    expect(menuAnchorRect(null)).toBeNull();
    const anchor = menuAnchorRect(new DOMRect(10, 20, 30, 40));
    expect(anchor).toEqual({ left: 10, top: 20, right: 40, bottom: 60, x: 10, y: 20, width: 30, height: 40 });
    expect(anchor).not.toBeInstanceOf(DOMRect);
  });

  it("finds the table and cell around the selection", () => {
    const editor = mount("<p>Before</p><table><tbody><tr><td><p>A</p></td><td><p>B</p></td></tr></tbody></table>");
    expect(selectedTableElement(editor)).toBeNull();
    let position = -1;
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text === "B") position = pos;
    });
    editor.commands.setTextSelection(position + 1);
    expect(selectedTableElement(editor)?.tagName).toBe("TABLE");
    expect(selectedTableCellElement(editor)?.textContent).toBe("B");
  });
});

describe("code highlighting", () => {
  it("offers the host's languages and loads nothing itself", () => {
    const loaded = vi.fn();
    const highlighting = createCodeHighlighting({ javascript: common.javascript, css: common.css }, loaded);
    expect(highlighting.languageNames).toEqual(["css", "javascript"]);
    const editor = mount("<pre><code>const a = 1</code></pre>", { codeLowlight: highlighting.lowlight });
    highlighting.loadForCodeBlock(editor, "bash", "echo");
    expect(highlighting.lowlight.registered("bash")).toBe(false);
    expect(loaded).not.toHaveBeenCalled();
  });

  it("offers the catalog with detected languages first and loads each grammar once", async () => {
    const loaded = vi.fn();
    const highlighting = createCodeHighlighting(null, loaded);
    const names = highlighting.languageNames;
    expect(names.slice(0, autoCodeLanguageNames.length)).toEqual([...autoCodeLanguageNames]);
    const rest = names.slice(autoCodeLanguageNames.length);
    expect(rest).toEqual([...rest].sort());
    expect(rest).toContain("abnf");

    const editor = mount('<pre><code class="language-abnf">rule = "a"</code></pre>', { codeLowlight: highlighting.lowlight });
    highlighting.loadForCodeBlock(editor, "abnf", 'rule = "a"');
    highlighting.loadForCodeBlock(editor, "abnf", 'rule = "a"');
    await vi.waitFor(() => expect(loaded).toHaveBeenCalledTimes(1));
    expect(highlighting.lowlight.registered("abnf")).toBe(true);
    highlighting.loadForCodeBlock(editor, "abnf", 'rule = "a"');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(loaded).toHaveBeenCalledTimes(1);
  });
});
