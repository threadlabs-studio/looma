import type { Editor } from "@tiptap/core";
import { page, userEvent } from "@vitest/browser/context";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, type App } from "vue";
import { LoomaEditor } from "../src/vue/editor/LoomaEditor";
import { editorDocumentToMarkdown, markdownToEditorDocument } from "../src/editor/expressmark";
import "../tokens.css";
import "../theme-light.css";
import "../vue/components.css";

const apps: App[] = [];

async function flushBrowser() {
  for (let index = 0; index < 4; index += 1) {
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

afterEach(async () => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.innerHTML = "";
  await flushBrowser();
});

async function mount(markdown: string) {
  const host = document.createElement("div");
  host.style.width = "min(480px, 100%)";
  host.style.marginTop = "120px";
  const outside = document.createElement("button");
  outside.textContent = "Outside the editor";
  outside.style.cssText = "position:fixed;right:0;bottom:0";
  document.body.append(outside, host);
  let editor: Editor | null = null;
  const app = createApp({
    render: () => h(LoomaEditor, { modelValue: markdownToEditorDocument(markdown), onReady: (instance: Editor) => { editor = instance; } }),
  });
  apps.push(app);
  app.mount(host);
  await flushBrowser();
  const popover = () => document.querySelector<HTMLElement>('[role="dialog"][aria-label="Edit footnote"]')?.closest<HTMLElement>("[popover]") ?? null;
  return { host, outside, editor: editor!, popover, markdown: () => editorDocumentToMarkdown(editor!.getJSON(), { original: markdown }) };
}

async function action(name: string) {
  const item = () => [...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-label="Footnote actions"] button')].find(node => (node.getAttribute("aria-label") || node.textContent?.trim()) === name);
  await vi.waitFor(() => expect(item()).toBeTruthy());
  await userEvent.click(item()!);
  await flushBrowser();
}

const field = () => document.querySelector<HTMLElement>('[role="dialog"][aria-label="Edit footnote"] [role="textbox"]')!;
const dismiss = async () => { await userEvent.keyboard("{Escape}"); await flushBrowser(); };

describe("LoomaEditor footnotes (real browser)", () => {
  it("offers one-line icon actions or floating editing, without exposing source labels", async () => {
    await page.viewport(1280, 900);
    const { host, outside, editor, popover, markdown } = await mount("One[^a] and two[^b].\n\n[^a]: First.\n\n[^b]: Second.");
    const reference = host.querySelector<HTMLElement>('.ProseMirror [data-looma-footnote-ref][data-label="a"]')!;
    expect(reference.textContent).toBe("1");
    expect(reference.getAttribute("aria-label")).toBe("Footnote 1");
    await userEvent.click(reference);
    await flushBrowser();
    expect(popover()).toBeNull();
    const actions = document.querySelector<HTMLElement>('[role="dialog"][aria-label="Footnote actions"]')!;
    expect(actions.querySelector('[role="menu"]')).toBeNull();
    const buttons = [...actions.querySelectorAll("button")];
    expect(buttons).toHaveLength(2);
    expect(buttons.every(button => button.querySelector("svg"))).toBe(true);
    expect(Math.abs(buttons[0].getBoundingClientRect().y - buttons[1].getBoundingClientRect().y)).toBeLessThan(2);
    await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')?.textContent?.trim()).toBe("Go to note"));
    await action("Edit note");
    expect(popover()?.matches(":popover-open")).toBe(true);
    await vi.waitFor(() => expect(document.activeElement).toBe(field()));
    expect(field().textContent).toBe("First.");
    expect(popover()!.querySelector('input, button, [data-footnote-label], [data-footnote-go]')).toBeNull();
    await userEvent.fill(field(), "The first note.");
    await flushBrowser();
    expect(markdown()).toBe("One[^a] and two[^b].\n\n[^a]: The first note.\n\n[^b]: Second.");
    await userEvent.click(outside);
    await flushBrowser();
    expect(popover()).toBeNull();
    expect(document.activeElement).toBe(outside);
    await userEvent.click(reference);
    await flushBrowser();
    await vi.waitFor(() => expect(document.activeElement?.getAttribute("aria-label")).toBe("Go to note"));
    await userEvent.keyboard("{Enter}");
    await flushBrowser();
    expect(popover()).toBeNull();
    await vi.waitFor(() => expect(document.activeElement).toBe(editor.view.dom));
    expect(editor.state.selection.$from.parent.textContent).toBe("The first note.");
    expect(editor.state.selection.$from.parentOffset).toBe("The first note.".length);
  });

  it("edits formatted multi-paragraph notes without flattening marks, links or other references", async () => {
    const { host, popover, markdown } = await mount("One[^a].\n\n[^a]: A **bold** note with [a source](https://example.com).\n\n    See also[^b].\n\n[^b]: Linked detail.");
    await userEvent.click(host.querySelector<HTMLElement>(".ProseMirror [data-looma-footnote-ref]")!);
    await action("Edit note");
    expect(field().querySelector("strong")?.textContent).toBe("bold");
    expect(field().querySelector('a[href="https://example.com"]')?.textContent).toBe("a source");
    expect(field().querySelectorAll("p").length).toBe(2);
    expect(field().getAttribute("contenteditable")).toBe("true");
    await userEvent.keyboard(" Added.{Enter}Another paragraph.");
    await flushBrowser();
    expect(popover()?.matches(":popover-open")).toBe(true);
    expect(field().querySelectorAll("p").length).toBe(3);
    expect(markdown()).toContain("**bold**");
    expect(markdown()).toContain("[a source](https://example.com)");
    expect(markdown()).toContain("[^b]: Linked detail.");
    expect(markdown()).toContain("Added.");
    expect(markdown()).toContain("Another paragraph.");
    await userEvent.keyboard("{Escape}");
    await flushBrowser();
    expect(popover()).toBeNull();
  });

  it("opens the floating editor on insertion and keeps references numbered in document order", async () => {
    const { host, editor, popover, markdown } = await mount("Start");
    editor.chain().focus("end").insertContent(" /footnote").run();
    await flushBrowser();
    const option = () => [...host.querySelectorAll<HTMLElement>(':is([data-component~="ui-editor-slash-menu"], .ui-editor-slash-menu) [role="option"]')]
      .find(item => item.textContent?.includes("Footnote"));
    await vi.waitFor(() => expect(option()).toBeTruthy(), { timeout: 3000 });
    await userEvent.click(option()!);
    await flushBrowser();
    expect(popover()?.matches(":popover-open")).toBe(true);
    await vi.waitFor(() => expect(document.activeElement).toBe(field()));
    await userEvent.keyboard("Cited.");
    await flushBrowser();
    expect(markdown()).toBe("Start [^1]\n\n[^1]: Cited.\n");
    await dismiss();
    editor.chain().setTextSelection(1).insertLoomaFootnote().run();
    await flushBrowser();
    expect(popover()?.matches(":popover-open")).toBe(true);
    await userEvent.keyboard("Earlier.");
    await dismiss();
    expect([...host.querySelectorAll('.ProseMirror [data-looma-footnote-ref]')].map(node => node.textContent)).toEqual(["1", "2"]);
    expect(markdown()).toContain("Earlier.");
    expect(markdown()).toContain("Cited.");
  });

  it("keeps the floating editor and action row usable at touch width", async () => {
    const viewport = { width: innerWidth, height: innerHeight };
    await page.viewport(375, 812);
    try {
      const { host, popover } = await mount("A note[^1].\n\n[^1]: A short note.");
      const reference = host.querySelector<HTMLElement>('.ProseMirror [data-looma-footnote-ref]')!;
      await userEvent.click(reference);
      await action("Edit note");
      const rect = popover()!.getBoundingClientRect();
      expect(rect.left).toBeGreaterThanOrEqual(0);
      expect(rect.right).toBeLessThanOrEqual(innerWidth);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(innerWidth);
      await dismiss();
      expect(document.activeElement).toBe(reference);
    } finally { await page.viewport(viewport.width, viewport.height); }
  });
});
