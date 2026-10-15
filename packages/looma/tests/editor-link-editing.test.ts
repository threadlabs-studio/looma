// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDefaultEditorExtensions } from "../src/editor/extensions";
import { createLinkEditing, linkFormStatus, type LoomaLinkEditing, type LoomaLinkTarget } from "../src/editor/link-editing";

const opened: { editor: Editor; links: LoomaLinkEditing }[] = [];
afterEach(() => opened.splice(0).forEach(({ editor, links }) => { links.destroy(); editor.destroy(); }));

function setup(html: string, options: { search?: (query: string) => Promise<LoomaLinkTarget[]>; resolve?: (href: string) => Promise<LoomaLinkTarget | null> } = {}) {
  const editor = new Editor({ extensions: getDefaultEditorExtensions(), content: html });
  const links = createLinkEditing({ editor, search: () => options.search, resolve: () => options.resolve, baseUrl: () => "" });
  opened.push({ editor, links });
  return { editor, links };
}

const linkAttrs = (editor: Editor) => editor.getJSON().content?.[0]?.content?.find((node) => node.marks?.length)?.marks?.[0]?.attrs;
const guide: LoomaLinkTarget = { id: "guide", label: "Guide", detail: "Docs", href: "/guide" };

describe("link editing", () => {
  it("links selected text as the reader types an address, and reports what is missing on save", () => {
    const { editor, links } = setup("<p>Hello world</p>");
    links.open(1, 6, "popover");
    expect(links.state).toMatchObject({ surface: "popover", mode: "url", text: "Hello", textEditable: false, range: { from: 1, to: 6, existing: false } });
    expect(links.apply(true)).toBe(false);
    expect(links.state.error).toBe("Enter an http, https, mailto, tel, or relative URL.");
    links.setDestination("https://example.com");
    expect(linkAttrs(editor)).toMatchObject({ href: "https://example.com", target: "_blank", rel: "noopener noreferrer" });
    expect(links.state).toMatchObject({ error: "", range: { existing: true } });
    links.setNewTab(false);
    expect(linkAttrs(editor)).toMatchObject({ href: "https://example.com", target: "_self", rel: null });
  });

  it("inserts linked text at a caret and asks for the text first", () => {
    const { editor, links } = setup("<p>See .</p>");
    links.open(5, 5, "popover");
    expect(links.state.textEditable).toBe(true);
    links.setDestination("https://example.com");
    expect(links.apply(true)).toBe(false);
    expect(links.state.error).toBe("Enter link text.");
    links.setText("the guide");
    expect(editor.getText()).toBe("See the guide.");
    expect(links.state.range).toEqual({ from: 5, to: 14, existing: true });
  });

  it("searches the host, drops a stale result, and links a chosen destination", async () => {
    let finish: Array<(results: LoomaLinkTarget[]) => void> = [];
    const search = vi.fn((_query: string) => new Promise<LoomaLinkTarget[]>((resolve) => { finish.push(resolve); }));
    const { editor, links } = setup("<p>Hello world</p>", { search });
    links.open(1, 6, "popover");
    expect(links.state.mode).toBe("target");
    expect(linkFormStatus(links.state)).toBe("Type at least two letters to search.");
    links.setDestination("Gu");
    links.setDestination("Gui");
    expect(search.mock.calls.map(([query]) => query)).toEqual(["Gu", "Gui"]);
    expect(linkFormStatus(links.state)).toBe("Searching…");
    finish[1]!([guide, { id: "bad", label: "Bad", href: "javascript:alert(1)" }]);
    await Promise.resolve();
    finish[0]!([{ id: "stale", label: "Stale", href: "/stale" }]);
    await vi.waitFor(() => expect(links.state.searching).toBe(false));
    expect(links.state.results).toEqual([guide]);
    links.choose(guide);
    expect(editor.getHTML()).toContain('href="/guide"');
    expect(links.state).toMatchObject({ query: "Guide", newTab: false, results: [] });
    links.setDestination("https://example.com");
    expect(links.state.mode).toBe("url");
    finish = [];
  });

  it("resolves the link at the caret once, and ends an in-place edit when the caret leaves", async () => {
    const resolve = vi.fn(async (href: string) => (href === "/guide" ? guide : null));
    const { editor, links } = setup('<p><a href="/guide">Guide</a> after</p>', { resolve });
    editor.commands.setTextSelection(3);
    await vi.waitFor(() => expect(links.state.current).toEqual(guide));
    editor.commands.setTextSelection(4);
    expect(resolve).toHaveBeenCalledTimes(1);
    links.open(4, 4, "context");
    expect(links.state).toMatchObject({ surface: "context", selected: guide, query: "Guide", range: { existing: true } });
    editor.commands.setTextSelection(10);
    expect(links.state.surface).toBe("none");
    expect(links.state.current).toBeNull();
  });

  it("removes the link at the caret and closes an in-place edit", () => {
    const { editor, links } = setup('<p><a href="https://example.com">Example</a></p>');
    editor.commands.setTextSelection(3);
    links.open(3, 3, "context");
    links.remove();
    expect(editor.getHTML()).toBe("<p>Example</p>");
    expect(links.state.surface).toBe("none");
  });
});
