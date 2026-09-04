import { userEvent } from "@vitest/browser/context";
import type { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, type App } from "vue";
import { defineCustomElements } from "@threadlabs/looma-core/loader";
import { LoomaEditor } from "./LoomaEditor";
import "../../../editor/src/editor.css";

const apps: App[] = [];

const flushBrowser = async () => {
  for (let index = 0; index < 4; index += 1) {
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
};

afterEach(async () => {
  for (const app of apps.splice(0)) app.unmount();
  await flushBrowser();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("LoomaEditor (real browser)", () => {
  it("ships table editing and themes its Tiptap controls through Looma tokens", async () => {
    defineCustomElements();
    const host = document.createElement("div");
    host.style.setProperty("--ui-accent-solid", "rgb(109 74 255)");
    host.style.setProperty("--ui-surface-muted", "rgb(242 240 255)");
    document.body.append(host);

    let editor: Editor | null = null;
    const updates = vi.fn();
    const app = createApp({
      render: () => h(LoomaEditor, {
        modelValue: {
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Format me" }] }],
        },
        onReady: (instance: Editor) => { editor = instance; },
        "onUpdate:modelValue": updates,
      }),
    });
    apps.push(app);
    app.mount(host);
    await Promise.all([
      customElements.whenDefined("ui-icon-button"),
      customElements.whenDefined("ui-editor-table-toolbar"),
    ]);
    await flushBrowser();

    expect(editor).toBeTruthy();
    editor!.chain().focus().setTextSelection({ from: 1, to: 7 }).run();
    await flushBrowser();
    await new Promise((resolve) => setTimeout(resolve, 300));
    await flushBrowser();

    const bold = document.querySelector<HTMLElement>('ui-icon-button[title="Bold"]')!;
    expect(bold).toBeTruthy();
    expect(document.querySelector('ui-icon-button[title="Heading 3"]')).toBeTruthy();
    expect(document.querySelector('ui-icon-button[title="Blockquote"]')).toBeTruthy();
    expect(document.querySelector('ui-icon-button[title="Code block"]')).toBeTruthy();
    expect(document.querySelector('ui-icon-button[title="Divider"]')).toBeTruthy();
    const boldButton = bold.shadowRoot!.querySelector("button")!;
    await userEvent.click(boldButton);
    await flushBrowser();
    const activeBold = document.querySelector<HTMLElement>('ui-icon-button[title="Bold"]')!;
    const activeBoldButton = activeBold.shadowRoot!.querySelector("button")!;
    expect(activeBold.getAttribute("variant")).toBe("solid");
    expect(getComputedStyle(activeBoldButton).getPropertyValue("--ui-accent-solid").trim())
      .toBe("rgb(109 74 255)");

    editor!.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run();
    await flushBrowser();
    const table = host.querySelector(".ProseMirror table")!;
    expect(table.querySelectorAll("tr")).toHaveLength(2);
    expect(document.querySelector("ui-editor-table-toolbar")).toBeTruthy();
    expect(document.querySelector("ui-editor-table-overlay")).toBeTruthy();
    expect(document.querySelector(".looma-editor__table-overlay-shell")?.hasAttribute("aria-hidden"))
      .toBe(false);

    const addRow = document.querySelector<HTMLElement>(
      'ui-editor-table-toolbar [data-action="add-row-after"]',
    )!;
    await userEvent.click(addRow);
    await flushBrowser();
    expect(table.querySelectorAll("tr")).toHaveLength(3);
    expect(updates).toHaveBeenCalled();
  });
});
