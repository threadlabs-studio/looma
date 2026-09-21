import type { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, type App } from "vue";
import { LoomaEditor } from "./LoomaEditor";
import "../../../editor/src/editor.css";

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
          '[data-component-root~="ui-editor-mention-menu"]',
        );
        expect(menu?.textContent).toContain("Ada Lovelace");
        const anchorRect = (menu as HTMLElement & { anchorRect?: unknown }).anchorRect;
        expect(anchorRect).toMatchObject({
          left: expect.any(Number),
          top: expect.any(Number),
          right: expect.any(Number),
          bottom: expect.any(Number),
        });
        expect(Object.getPrototypeOf(anchorRect)).toBe(Object.prototype);
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
          '[data-component-root~="ui-editor-slash-menu"]',
        );
        expect(menu?.textContent).toContain("Table");
        const items = (menu as HTMLElement & {
          items?: Array<Record<string, unknown>>;
        }).items;
        expect(items?.[0]).toEqual({
          title: expect.any(String),
          description: expect.any(String),
          icon: expect.any(String),
        });
        expect(items?.[0]).not.toHaveProperty("keywords");
        expect(items?.[0]).not.toHaveProperty("command");
      });
      expect(browserErrors).toEqual([]);
    } finally {
      window.removeEventListener("error", onError);
    }
  });
});
