import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, ref, type App } from "vue";

vi.mock("@threadlabs/looma-editor", () => ({
  createLoomaMentionExtension: () => "fixture-mention",
  DEFAULT_MENTION_RESULT_LIMIT: 8,
  getDefaultEditorExtensions: () => ["fixture-extension"],
}));

import {
  EDITOR_ADAPTER_COMPONENT_TAG_MAP,
  EditorMentionMenu,
  EditorSlashMenu,
  EditorTableOverlay,
  EditorToolbar,
  getDefaultEditorExtensions,
} from "./index";

const apps: App[] = [];

async function settleCustomElements(root: ParentNode): Promise<void> {
  const elements = Array.from(root.querySelectorAll<HTMLElement>("*"));
  await Promise.all(elements.map((element) => {
    const componentOnReady = (element as HTMLElement & {
      componentOnReady?: () => Promise<unknown>;
    }).componentOnReady;
    return componentOnReady?.call(element);
  }));
  // Stencil resolves componentOnReady before its app-level load event runs on
  // the next task. Keep the jsdom window alive through that final dispatch.
  await new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.innerHTML = "";
});

describe("@threadlabs/looma-vue/editor adapter", () => {
  it("co-locates editor helpers and Vue editor wrappers", () => {
    expect(getDefaultEditorExtensions()).toEqual(["fixture-extension"]);
    expect(EDITOR_ADAPTER_COMPONENT_TAG_MAP.EditorToolbar).toBe("ui-editor-toolbar");
    expect(EDITOR_ADAPTER_COMPONENT_TAG_MAP.EditorSlashMenu).toBe("ui-editor-slash-menu");
    expect(EDITOR_ADAPTER_COMPONENT_TAG_MAP.EditorMentionMenu).toBe("ui-editor-mention-menu");
  });

  it("renders the editor wrapper tags", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () => h("div", [
        h(EditorToolbar),
        h(EditorSlashMenu),
        h(EditorMentionMenu),
        h(EditorTableOverlay),
      ]),
    });
    apps.push(app);
    app.mount(host);
    await settleCustomElements(host);

    expect(host.querySelector("ui-editor-toolbar")).toBeTruthy();
    expect(host.querySelector("ui-editor-slash-menu")).toBeTruthy();
    expect(host.querySelector("ui-editor-mention-menu")).toBeTruthy();
    expect(host.querySelector("ui-editor-table-overlay")).toBeTruthy();
  });

  it("forwards editor events and replaces listeners without leaking them", async () => {
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();
    const onTableAction = ref(firstHandler);
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () => h(EditorToolbar, { onTableAction: onTableAction.value }),
    });
    apps.push(app);
    app.mount(host);
    await settleCustomElements(host);

    const toolbar = host.querySelector("ui-editor-toolbar");
    const detail = { action: "delete-table", trigger: "keyboard" };
    toolbar?.dispatchEvent(new CustomEvent("looma-editor-table-action", { detail }));
    expect(firstHandler).toHaveBeenCalledOnce();
    expect(firstHandler).toHaveBeenCalledWith(detail);

    onTableAction.value = secondHandler;
    await nextTick();
    toolbar?.dispatchEvent(new CustomEvent("looma-editor-table-action", { detail }));
    expect(firstHandler).toHaveBeenCalledOnce();
    expect(secondHandler).toHaveBeenCalledOnce();

    app.unmount();
    apps.splice(apps.indexOf(app), 1);
    toolbar?.dispatchEvent(new CustomEvent("looma-editor-table-action", { detail }));
    expect(secondHandler).toHaveBeenCalledOnce();
  });

  it("forwards slash-menu events", async () => {
    const onSlashMenuHighlight = vi.fn();
    const onSlashMenuSelect = vi.fn();
    const items = [{ title: "Paragraph", description: "Plain text", icon: "pilcrow" as const }];
    const anchorRect = { x: 12, y: 24, width: 30, height: 18 };
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () => h(EditorSlashMenu, {
        open: true,
        query: "par",
        items,
        selectedIndex: 1,
        anchorRect,
        onSlashMenuHighlight,
        onSlashMenuSelect,
      }),
    });
    apps.push(app);
    app.mount(host);
    await settleCustomElements(host);

    const slashMenu = host.querySelector("ui-editor-slash-menu") as HTMLElement & {
      open: boolean;
      query: string;
      items: unknown[];
      selectedIndex: number;
      anchorRect: typeof anchorRect | null;
    };
    expect(slashMenu.open).toBe(true);
    expect(slashMenu.query).toBe("par");
    expect(slashMenu.items).toBe(items);
    expect(slashMenu.selectedIndex).toBe(1);
    expect(slashMenu.anchorRect).toBe(anchorRect);

    const highlight = { index: 1 };
    const select = { index: 0 };
    slashMenu.dispatchEvent(new CustomEvent("looma-editor-slash-menu-highlight", {
      detail: highlight,
    }));
    slashMenu.dispatchEvent(new CustomEvent("looma-editor-slash-menu-select", {
      detail: select,
    }));
    expect(onSlashMenuHighlight).toHaveBeenCalledWith(highlight);
    expect(onSlashMenuSelect).toHaveBeenCalledWith(select);
  });

  it("forwards mention-menu props and events", async () => {
    const onMentionMenuHighlight = vi.fn();
    const onMentionMenuSelect = vi.fn();
    const items = [{ id: "ada", label: "Ada Lovelace", detail: "ada@example.com" }];
    const anchorRect = { x: 12, y: 24, width: 1, height: 18 };
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () => h(EditorMentionMenu, {
        open: true,
        query: "ad",
        items,
        selectedIndex: 0,
        anchorRect,
        onMentionMenuHighlight,
        onMentionMenuSelect,
      }),
    });
    apps.push(app);
    app.mount(host);
    await settleCustomElements(host);

    const menu = host.querySelector("ui-editor-mention-menu") as HTMLElement & {
      open: boolean;
      query: string;
      items: unknown[];
      selectedIndex: number;
      anchorRect: typeof anchorRect | null;
    };
    expect(menu.open).toBe(true);
    expect(menu.query).toBe("ad");
    expect(menu.items).toBe(items);
    expect(menu.anchorRect).toBe(anchorRect);

    menu.dispatchEvent(new CustomEvent("looma-editor-mention-menu-highlight", {
      detail: { index: 0 },
    }));
    menu.dispatchEvent(new CustomEvent("looma-editor-mention-menu-select", {
      detail: { index: 0 },
    }));
    expect(onMentionMenuHighlight).toHaveBeenCalledWith({ index: 0 });
    expect(onMentionMenuSelect).toHaveBeenCalledWith({ index: 0 });
  });
});
