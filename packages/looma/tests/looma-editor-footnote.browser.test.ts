import type { Editor } from "@tiptap/core";
import { userEvent } from "@vitest/browser/context";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, type App } from "vue";
import { LoomaEditor } from "../src/vue/editor/LoomaEditor";
import { loomaMarkdownFromDoc, loomaMarkdownToHtml } from "../src/editor/extensions";
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
  document.body.append(host);
  let editor: Editor | null = null;
  const app = createApp({
    render: () => h(LoomaEditor, { modelValue: loomaMarkdownToHtml(markdown), onReady: (instance: Editor) => { editor = instance; } }),
  });
  apps.push(app);
  app.mount(host);
  await flushBrowser();
  const popover = () => document.querySelector<HTMLElement>("[data-footnote-note]")?.closest<HTMLElement>("[popover]") ?? null;
  return { host, editor: editor!, popover, markdown: () => loomaMarkdownFromDoc(editor!.state.doc) };
}

describe("LoomaEditor footnotes (real browser)", () => {
  it("previews and edits a note from its reference, renames it, and goes to the note", async () => {
    const { host, editor, popover, markdown } = await mount("One[^a] and two[^b].\n\n[^a]: First.\n\n[^b]: Second.");
    const reference = host.querySelector<HTMLElement>('.ProseMirror [data-looma-footnote-ref][data-label="a"]')!;
    expect(reference.textContent).toBe("1");
    expect(reference.getAttribute("aria-label")).toBe("Footnote 1");

    await userEvent.click(reference);
    await flushBrowser();
    await vi.waitFor(() => expect(popover()?.matches(":popover-open")).toBe(true));
    expect(popover()!.getBoundingClientRect().top).toBeGreaterThanOrEqual(reference.getBoundingClientRect().bottom);
    const note = popover()!.querySelector<HTMLTextAreaElement>("[data-footnote-note]")!;
    expect(document.activeElement).toBe(note);
    expect(note.value).toBe("First.");
    expect(note.readOnly).toBe(false);

    await userEvent.fill(note, "The first note.");
    await flushBrowser();
    expect(markdown()).toBe("One[^a] and two[^b].\n\n[^a]: The first note.\n\n[^b]: Second.");

    const label = popover()!.querySelector<HTMLInputElement>("[data-footnote-label]")!;
    await userEvent.fill(label, "b");
    await userEvent.keyboard("{Enter}");
    await flushBrowser();
    expect(popover()!.textContent).toContain("Another footnote uses this label.");
    expect(label.getAttribute("aria-invalid")).toBe("true");

    await userEvent.click(reference);
    await flushBrowser();
    await userEvent.fill(popover()!.querySelector<HTMLInputElement>("[data-footnote-label]")!, "first");
    await userEvent.keyboard("{Enter}");
    await flushBrowser();
    expect(popover()!.matches(":popover-open")).toBe(false);
    expect(markdown()).toBe("One[^first] and two[^b].\n\n[^first]: The first note.\n\n[^b]: Second.");
    expect(document.activeElement).toBe(host.querySelector('.ProseMirror [data-looma-footnote-ref][data-label="first"]'));

    await userEvent.keyboard("{Enter}");
    await flushBrowser();
    expect(popover()!.matches(":popover-open")).toBe(true);
    await userEvent.click(popover()!.querySelector<HTMLElement>("[data-footnote-go]")!);
    await flushBrowser();
    expect(popover()!.matches(":popover-open")).toBe(false);
    expect(editor.state.selection.$from.parent.textContent).toBe("The first note.");
    expect(editor.state.selection.$from.parentOffset).toBe("The first note.".length);
  });

  it("shows a formatted note read-only", async () => {
    const { host, popover } = await mount("One[^a].\n\n[^a]: A **bold** note.\n\n    More.");
    await userEvent.click(host.querySelector<HTMLElement>(".ProseMirror [data-looma-footnote-ref]")!);
    await flushBrowser();
    const note = popover()!.querySelector<HTMLTextAreaElement>("[data-footnote-note]")!;
    expect(note.readOnly).toBe(true);
    expect(note.value).toBe("A bold note.\nMore.");
  });

  it("inserts a footnote from the slash menu and leaves the caret in its note", async () => {
    const { host, editor, markdown } = await mount("Start");
    editor.chain().focus("end").insertContent(" /footnote").run();
    await flushBrowser();
    const option = () => [...host.querySelectorAll<HTMLElement>(':is([data-component~="ui-editor-slash-menu"], .ui-editor-slash-menu) [role="option"]')]
      .find((item) => item.textContent?.includes("Footnote"));
    await vi.waitFor(() => expect(option()).toBeTruthy(), { timeout: 3000 });
    await userEvent.click(option()!);
    await flushBrowser();
    await userEvent.keyboard("Cited.");
    expect(markdown()).toBe("Start [^1]\n\n[^1]: Cited.");
  });
});
