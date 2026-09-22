import type { Editor } from "@tiptap/core";
import { userEvent } from "@vitest/browser/context";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, type App } from "vue";
import { LoomaEditor } from "../src/vue/editor/LoomaEditor";
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
  await flushBrowser();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("LoomaEditor managed suggestion menus", () => {
  it("projects native suggestion rectangles through the managed component boundary", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const browserErrors: string[] = [];
    const onError = (event: ErrorEvent) => browserErrors.push(event.message);
    window.addEventListener("error", onError);

    let editor: Editor | null = null;
    const mentionProvider = vi.fn(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      return [{ id: "ada", label: "Ada Lovelace", detail: "ada@example.com" }];
    });
    const app = createApp({
      render: () => h(LoomaEditor, {
        mentionProvider,
        onReady: (instance: Editor) => { editor = instance; },
      }),
    });
    apps.push(app);

    try {
      app.mount(host);
      await flushBrowser();
      editor!.chain().focus().insertContent("@ad").run();

      await vi.waitFor(() => {
        const menu = host.querySelector<HTMLElement>(
          '[data-component~="ui-editor-mention-menu"]',
        );
        expect(menu?.textContent).toContain("Ada Lovelace");
        // The menu is placed at the caret's rectangle.
        expect(menu?.style.position).toBe("fixed");
        expect(Number.parseFloat(menu?.style.top ?? "")).toBeGreaterThan(0);
        expect(Number.parseFloat(menu?.style.left ?? "")).toBeGreaterThanOrEqual(0);
      });
      expect(browserErrors).toEqual([]);
    } finally {
      window.removeEventListener("error", onError);
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
        onReady: (instance: Editor) => { editor = instance; },
      }),
    });
    apps.push(app);

    try {
      app.mount(host);
      await flushBrowser();
      editor!.chain().focus().insertContent("/tab").run();

      await vi.waitFor(() => {
        const menu = host.querySelector<HTMLElement>(
          '[data-component~="ui-editor-slash-menu"]',
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
        onReady: (instance: Editor) => { editor = instance; },
      }),
    });
    apps.push(app);
    app.mount(host);
    await flushBrowser();

    editor!.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run();
    await flushBrowser();
    const table = host.querySelector(".ProseMirror table")!;
    expect(table.querySelectorAll("tr")).toHaveLength(2);
    await userEvent.click(table.querySelector<HTMLElement>("th, td")!);
    await flushBrowser();
    const handle = host.querySelector<HTMLElement>(
      '[data-component~="ui-editor-table-overlay"] [data-action="add-row-after"][data-boundary-index="1"]',
    )!;
    expect(handle).toBeTruthy();

    await userEvent.click(handle);
    await flushBrowser();
    expect(table.querySelectorAll("tr")).toHaveLength(3);
  });
});
