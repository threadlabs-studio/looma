import type { Editor } from "@tiptap/core";
import { page, userEvent } from "@vitest/browser/context";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, type App } from "vue";
import { UiEditor } from "../src/components/ui-editor/ui-editor.html";
import { editorUnderTest } from "./editor-test-target";
const LoomaEditor = await editorUnderTest(UiEditor);
import { captureEditor } from "./editor-test-extensions";

const apps: App[] = [];

async function flushBrowser() {
  for (let index = 0; index < 4; index += 1) {
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

afterEach(async () => {
  for (const app of apps.splice(0)) app.unmount();
  await flushBrowser();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("LoomaEditor managed suggestion menus", () => {
  it("moves cell actions with hover and keyboard focus and dismisses table controls outside the table", async () => {
    Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });
    const host = document.createElement("div");
    host.style.marginLeft = "48px";
    host.style.width = "240px";
    document.body.append(host);
    let editor: Editor | null = null;
    const app = createApp({ render: () => h(LoomaEditor, {
      extensions: captureEditor(instance => { editor = instance; }),
    }) });
    apps.push(app);
    app.mount(host);
    await flushBrowser();
    await expect.poll(() => editor).toBeTruthy();
    editor!.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: false }).run();
    editor!.commands.insertContentAt(editor!.state.doc.content.size, { type: "paragraph", content: [{ type: "text", text: "After table" }] });
    await flushBrowser();
    const cells = Array.from(host.querySelectorAll<HTMLTableCellElement>(".ProseMirror td"));
    const menu = () => host.querySelector<HTMLElement>('[data-action="open-cell-menu"]');
    await userEvent.click(cells[0]!);
    await flushBrowser();
    expect(menu()?.dataset.columnIndex).toBe("0");
    await userEvent.hover(cells[3]!);
    await flushBrowser();
    expect(menu()?.dataset.rowIndex).toBe("1");
    expect(menu()?.dataset.columnIndex).toBe("1");
    await userEvent.click(cells[0]!);
    await userEvent.keyboard("{Tab}");
    await userEvent.hover(host);
    await flushBrowser();
    expect(menu()?.dataset.rowIndex).toBe("0");
    expect(menu()?.dataset.columnIndex).toBe("1");
    await userEvent.click(menu()!);
    await flushBrowser();
    const contextMenu = host.querySelector<HTMLElement>(':is([data-component~="ui-editor-table-context-menu"], .ui-editor-table-context-menu)')!;
    expect(contextMenu).toBeTruthy();
    await userEvent.click(contextMenu.querySelector<HTMLElement>('[data-action="delete-row"]')!);
    await flushBrowser();
    expect(host.querySelectorAll(".ProseMirror tr")).toHaveLength(1);
    expect(menu()?.dataset.rowIndex).toBe("0");
    editor!.commands.setTextSelection(editor!.state.doc.content.size - 1);
    await flushBrowser();
    expect(host.querySelector(':is([data-component~="ui-editor-table-toolbar"], .ui-editor-table-toolbar)')).toBeNull();
    expect(menu()).toBeNull();
  });
  it("projects native suggestion rectangles through the managed component boundary", async () => {
    const originalViewport = { width: window.innerWidth, height: window.innerHeight };
    await page.viewport(1280, 800);
    const host = document.createElement("div");
    const scroller = document.createElement("div");
    Object.assign(scroller.style, { height: "400px", overflow: "auto", transform: "translateY(0)" });
    const spacer = document.createElement("div");
    spacer.style.height = "100px";
    host.style.minHeight = "800px";
    scroller.append(spacer, host);
    document.body.append(scroller);
    const browserErrors: string[] = [];
    const onError = (event: ErrorEvent) => browserErrors.push(event.message);
    window.addEventListener("error", onError);

    let editor: Editor | null = null;
    const mentionQuery = vi.fn(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      return [{ id: "ada", label: "Ada Lovelace", detail: "ada@example.com" }];
    });
    const app = createApp({
      render: () => h(LoomaEditor, {
        mentionQuery,
        extensions: captureEditor(instance => { editor = instance; }),
      }),
    });
    apps.push(app);

    try {
      app.mount(host);
      await flushBrowser();
    await expect.poll(() => editor).toBeTruthy();
      // Suggestions start only from a typed "@".
      await userEvent.click(editor!.view.dom);
      await userEvent.keyboard("@ad");

      await vi.waitFor(() => {
        const menu = host.querySelector<HTMLElement>(
          ':is([data-component~="ui-editor-mention-menu"], .ui-editor-mention-menu)',
        );
        expect(menu?.textContent).toContain("Ada Lovelace");
        // The menu is placed at the caret's rectangle.
        expect(menu?.style.position).toBe("fixed");
        expect(Number.parseFloat(menu?.style.top ?? "")).toBeGreaterThan(0);
        expect(Number.parseFloat(menu?.style.left ?? "")).toBeGreaterThanOrEqual(0);
      });
      const menu = document.querySelector<HTMLElement>(':is([data-component~="ui-editor-mention-menu"], .ui-editor-mention-menu)')!;
      expect(menu.matches(":popover-open")).toBe(true);
      const before = menu.getBoundingClientRect().top;
      scroller.scrollTop = 40;
      await flushBrowser();
      await vi.waitFor(() => expect(Math.abs(menu.getBoundingClientRect().top - (before - 40))).toBeLessThan(2));
      expect(browserErrors).toEqual([]);
    } finally {
      window.removeEventListener("error", onError);
      await page.viewport(originalViewport.width, originalViewport.height);
    }
  });

  it("projects slash commands to the managed menu item contract", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const browserErrors: string[] = [];
    const onError = (event: ErrorEvent) => browserErrors.push(event.message);
    window.addEventListener("error", onError);

    let editor: Editor | null = null;
    const app = createApp({
      render: () => h(LoomaEditor, {
        extensions: captureEditor(instance => { editor = instance; }),
      }),
    });
    apps.push(app);

    try {
      app.mount(host);
      await flushBrowser();
    await expect.poll(() => editor).toBeTruthy();
      editor!.chain().focus().insertContent("/tab").run();

      await vi.waitFor(() => {
        const menu = host.querySelector<HTMLElement>(
          ':is([data-component~="ui-editor-slash-menu"], .ui-editor-slash-menu)',
        );
        expect(menu?.textContent).toContain("Table");
        // Each item shows a title, a description, and an icon.
        const item = menu?.querySelector('[role="option"]');
        expect(item?.querySelector(".title")?.textContent).toBeTruthy();
        expect(item?.querySelector(".description")?.textContent).toBeTruthy();
        expect(item?.querySelector("svg path, svg rect, svg circle")).not.toBeNull();
      });
      expect(browserErrors).toEqual([]);
    } finally {
      window.removeEventListener("error", onError);
    }
  });

  it("keeps managed table insertion handles stable through a real pointer click", async () => {
    Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });
    const host = document.createElement("div");
    host.style.marginLeft = "48px";
    host.style.width = "240px";
    document.body.append(host);
    let editor: Editor | null = null;
    const app = createApp({
      render: () => h(LoomaEditor, {
        extensions: captureEditor(instance => { editor = instance; }),
      }),
    });
    apps.push(app);
    app.mount(host);
    await flushBrowser();
    await expect.poll(() => editor).toBeTruthy();

    editor!.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run();
    await flushBrowser();
    const table = host.querySelector(".ProseMirror table")!;
    expect(table.querySelectorAll("tr")).toHaveLength(2);
    await userEvent.click(table.querySelector<HTMLElement>("th, td")!);
    await flushBrowser();
    const handle = host.querySelector<HTMLElement>(
      ':is([data-component~="ui-editor-table-overlay"], .ui-editor-table-overlay) [data-action="add-row-after"][data-boundary-index="1"]',
    )!;
    expect(handle).toBeTruthy();

    await userEvent.click(handle);
    await flushBrowser();
    expect(table.querySelectorAll("tr")).toHaveLength(3);
  });
});
