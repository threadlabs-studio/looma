import { userEvent } from "@vitest/browser/context";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, ref, shallowRef, type App } from "vue";
import type { SlashMenuAnchorRect, TableOverlayGeometry } from "@threadlabs/looma-editor";

const apps: App[] = [];

const flushBrowser = async () => {
  for (let index = 0; index < 3; index += 1) {
    await Promise.resolve();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
};

afterEach(async () => {
  for (const app of apps.splice(0)) {
    app.unmount();
  }
  await flushBrowser();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("@threadlabs/looma-vue release registration (real browser)", () => {
  it("composes concise field help with an accessible ghost button", async () => {
    const { Button, Tooltip, FormField, Input } = await import("./index");
    const onClose = vi.fn();
    const help = ref("Use the name shown on your invoice.");
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () => h(FormField, null, () => [
        h("div", [
          h("label", { for: "account-name" }, "Account name"),
          h(Button, { variant: "ghost", size: "sm" }, () => h("button", {
            id: "account-help", type: "button", "aria-label": "Help for account name",
          }, [h("span", { "aria-hidden": "true" }, "?")])),
          h(Tooltip, { for: "account-help", toggleOnClick: true, onClose }, () => help.value),
        ]),
        h(Input, null, () => h("input", { id: "account-name" })),
      ]),
    });
    apps.push(app);
    app.mount(host);
    await customElements.whenDefined("ui-tooltip");
    await flushBrowser();
    const button = host.querySelector<HTMLButtonElement>("button")!;
    const tooltip = host.querySelector<HTMLElement>("ui-tooltip")!;
    await expect.poll(() => tooltip.id).not.toBe('');
    expect(button.getAttribute("aria-describedby")).toBe(tooltip.id);
    expect(button.getAttribute("aria-label")).toBe("Help for account name");
    expect(tooltip.hidden).toBe(true);
    await userEvent.tab();
    expect(document.activeElement).toBe(button);
    await flushBrowser();
    expect(tooltip.hidden).toBe(false);
    await userEvent.keyboard("{Escape}");
    await flushBrowser();
    expect(tooltip.hidden).toBe(true);
    expect(document.activeElement).toBe(button);
    expect(onClose).toHaveBeenLastCalledWith({ open: false, reason: "escape", trigger: "keyboard" });
    await userEvent.click(button);
    await flushBrowser();
    expect(tooltip.hidden).toBe(false);
    help.value = "Use your billing account name.";
    await nextTick();
    expect(tooltip.textContent).toBe(help.value);
    await userEvent.click(button);
    await flushBrowser();
    expect(tooltip.hidden).toBe(true);
    await userEvent.keyboard("{Enter}");
    await flushBrowser();
    expect(tooltip.hidden).toBe(false);
    await userEvent.tab();
    await flushBrowser();
    expect(tooltip.hidden).toBe(true);
    expect(document.activeElement?.id).toBe("account-name");
  });

  it("preserves Vue-owned values in slotted native form controls", async () => {
    const { Input, Select, Textarea } = await import("./index");
    const name = ref("Blue Ridge Collector Cars");
    const cargoType = ref("boat");
    const notes = ref("Marina pickup");
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () => h("div", [
        h(Input, null, () => h("input", {
          value: name.value,
          onInput: (event: Event) => { name.value = (event.target as HTMLInputElement).value; },
        })),
        h(Select, null, () => h("select", {
          value: cargoType.value,
          onChange: (event: Event) => { cargoType.value = (event.target as HTMLSelectElement).value; },
        }, [
          h("option", { value: "road_vehicle" }, "Road vehicles"),
          h("option", { value: "boat" }, "Boats"),
        ])),
        h(Textarea, null, () => h("textarea", {
          value: notes.value,
          onInput: (event: Event) => { notes.value = (event.target as HTMLTextAreaElement).value; },
        })),
      ]),
    });
    apps.push(app);
    app.mount(host);

    await Promise.all([
      customElements.whenDefined("ui-input"),
      customElements.whenDefined("ui-select"),
      customElements.whenDefined("ui-textarea"),
    ]);
    await flushBrowser();

    const input = host.querySelector<HTMLInputElement>("ui-input input")!;
    const select = host.querySelector<HTMLSelectElement>("ui-select select")!;
    const textarea = host.querySelector<HTMLTextAreaElement>("ui-textarea textarea")!;
    expect(input.value).toBe("Blue Ridge Collector Cars");
    expect(select.value).toBe("boat");
    expect(textarea.value).toBe("Marina pickup");

    name.value = "Heritage Marine Sales";
    cargoType.value = "road_vehicle";
    notes.value = "Dealer pickup";
    await nextTick();
    await flushBrowser();

    expect(input.value).toBe("Heritage Marine Sales");
    expect(select.value).toBe("road_vehicle");
    expect(textarea.value).toBe("Dealer pickup");

    await userEvent.fill(input, "Gulf Coast Classics");
    await userEvent.selectOptions(select, "boat");
    await userEvent.fill(textarea, "Ramp access confirmed");
    expect(name.value).toBe("Gulf Coast Classics");
    expect(cargoType.value).toBe("boat");
    expect(notes.value).toBe("Ramp access confirmed");
  });

  it("preserves Stencil's hydration marker across reactive Vue class updates", async () => {
    const { TreeItem } = await import("./index");
    const itemClass = ref("consumer-tree-item");
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () => h(TreeItem, {
        class: itemClass.value,
        "item-id": "page-1",
        label: "Page one",
      }, () => "Page one"),
    });
    apps.push(app);
    app.mount(host);

    await customElements.whenDefined("ui-tree-item");
    await flushBrowser();
    const item = host.querySelector<HTMLElement>("ui-tree-item")!;
    expect(item.classList.contains("hydrated")).toBe(true);
    expect(getComputedStyle(item).visibility).not.toBe("hidden");

    itemClass.value = "consumer-tree-item consumer-tree-item--selected";
    await nextTick();
    await flushBrowser();

    expect(item.classList.contains("hydrated")).toBe(true);
    expect(item.classList.contains("consumer-tree-item--selected")).toBe(true);
    expect(getComputedStyle(item).visibility).not.toBe("hidden");
  });

  it("registers and renders the supported baseline without warnings or duplicate-definition errors", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const adapter = await import("./index");
    const editorAdapter = await import("./editor/index");
    const { defineCustomElements } = await import("@threadlabs/looma-core/loader");

    expect(() => defineCustomElements()).not.toThrow();
    expect(() => defineCustomElements()).not.toThrow();

    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () =>
        h(adapter.Stack, { gap: "md" }, () => [
          h(adapter.TopBar, null, () => h("h1", "Workspace")),
          h(adapter.Button, null, () => h("button", { type: "button" }, "Save")),
          h(adapter.ContextMenu, null, () => [
            h("button", { slot: "trigger", type: "button" }, "Page actions"),
            h(adapter.MenuItem, { value: "rename" }, () => "Rename"),
          ]),
          h(editorAdapter.EditorToolbar, null, () => h("button", { type: "button" }, "Bold")),
        ]),
    });
    apps.push(app);
    app.mount(host);

    await Promise.all([
      customElements.whenDefined("ui-stack"),
      customElements.whenDefined("ui-button"),
      customElements.whenDefined("ui-context-menu"),
      customElements.whenDefined("ui-editor-toolbar"),
    ]);
    await flushBrowser();

    expect(host.querySelector("ui-stack ui-top-bar")).toBeTruthy();
    expect(host.querySelector("ui-button")?.shadowRoot).toBeTruthy();
    expect(host.querySelector("ui-context-menu [slot='trigger']")?.textContent).toBe("Page actions");
    expect(host.querySelector("ui-editor-toolbar button")?.textContent).toBe("Bold");
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("preserves button variants and disabled presentation after custom-element registration", async () => {
    const { Button } = await import("./index");
    const disabled = ref(false);
    const host = document.createElement("div");
    host.style.setProperty("--ui-surface-default", "rgb(255 255 255)");
    host.style.setProperty("--ui-surface-muted", "rgb(248 248 246)");
    host.style.setProperty("--ui-surface-subtle", "rgb(240 240 236)");
    host.style.setProperty("--ui-text-primary", "rgb(26 26 26)");
    host.style.setProperty("--ui-text-on-accent", "rgb(255 255 255)");
    host.style.setProperty("--ui-border-default", "rgb(228 228 224)");
    host.style.setProperty("--ui-border-strong", "rgb(200 200 196)");
    host.style.setProperty("--ui-accent-solid", "rgb(109 74 255)");
    host.style.setProperty("--ui-accent-hover", "rgb(89 56 223)");
    host.style.setProperty("--ui-accent-active", "rgb(70 40 189)");
    host.style.setProperty("--ui-danger-solid", "rgb(180 35 63)");
    host.style.setProperty("--ui-danger-hover", "rgb(148 29 53)");
    document.body.append(host);
    const app = createApp({
      render: () => h("div", [
        h(Button, { variant: "solid", disabled: disabled.value }, () =>
          h("button", { id: "solid-button", type: "button" }, "Invite"),
        ),
        h(Button, { variant: "ghost" }, () =>
          h("button", { id: "ghost-button", type: "button" }, "Sign out"),
        ),
        h(Button, { variant: "destructive" }, () =>
          h("button", { id: "destructive-button", type: "button" }, "Delete"),
        ),
      ]),
    });
    apps.push(app);
    app.mount(host);

    await customElements.whenDefined("ui-button");
    await flushBrowser();

    const solid = host.querySelector<HTMLElement>("ui-button:has(#solid-button)")!;
    const ghost = host.querySelector<HTMLElement>("ui-button:has(#ghost-button)")!;
    const destructive = host.querySelector<HTMLElement>("ui-button:has(#destructive-button)")!;

    await userEvent.unhover(destructive.querySelector("button")!);
    await flushBrowser();

    expect(solid.getAttribute("data-variant")).toBe("solid");
    expect(ghost.getAttribute("data-variant")).toBe("ghost");
    expect(destructive.getAttribute("data-variant")).toBe("destructive");
    expect(solid.hasAttribute("data-disabled")).toBe(false);
    expect(getComputedStyle(solid).opacity).toBe("1");
    expect(getComputedStyle(solid.querySelector("button")!).backgroundColor).toBe("rgb(109, 74, 255)");
    expect(getComputedStyle(ghost.querySelector("button")!).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(ghost.querySelector("button")!).borderColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(destructive.querySelector("button")!).backgroundColor).toBe("rgb(180, 35, 63)");

    disabled.value = true;
    await nextTick();
    await flushBrowser();

    expect(solid.getAttribute("data-disabled")).toBe("true");
    expect(getComputedStyle(solid).opacity).toBe("0.6");
    expect(getComputedStyle(solid.querySelector("button")!).opacity).toBe("1");
  });

  it("projects slash-menu properties through the registered element boundary", async () => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(1280);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(720);
    const { EditorSlashMenu } = await import("./editor/index");
    const items = [{ title: "Paragraph", description: "Plain text", icon: "pilcrow" as const }];
    const domRect = new DOMRect(12, 24, 30, 18);
    const anchorRect = shallowRef<SlashMenuAnchorRect>(domRect);
    const query = shallowRef("par");
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () => h(EditorSlashMenu, {
        open: true,
        query: query.value,
        items,
        selectedIndex: 0,
        anchorRect: anchorRect.value,
      }),
    });
    apps.push(app);
    app.mount(host);
    await customElements.whenDefined("ui-editor-slash-menu");
    await flushBrowser();

    const slashMenu = host.querySelector("ui-editor-slash-menu") as HTMLElement & {
      open: boolean;
      query: string;
      items: unknown[];
      selectedIndex: number;
      anchorRect: SlashMenuAnchorRect | null;
    };
    expect(slashMenu.anchorRect).toBe(domRect);
    expect(slashMenu.style.left).toBe("12px");

    const prototype = Object.getPrototypeOf(slashMenu) as typeof slashMenu;
    const writes = {
      open: vi.spyOn(prototype, "open", "set"),
      query: vi.spyOn(prototype, "query", "set"),
      items: vi.spyOn(prototype, "items", "set"),
      selectedIndex: vi.spyOn(prototype, "selectedIndex", "set"),
      anchorRect: vi.spyOn(prototype, "anchorRect", "set"),
    };

    query.value = "table";
    await nextTick();
    expect(slashMenu.query).toBe("table");
    expect(Object.fromEntries(Object.entries(writes).map(([name, spy]) => [name, spy.mock.calls.length])))
      .toEqual({ open: 0, query: 1, items: 0, selectedIndex: 0, anchorRect: 0 });

    Object.values(writes).forEach((spy) => spy.mockClear());
    const tiptapRect = {
      x: 64,
      y: 80,
      width: 1,
      height: 16,
      top: 80,
      right: 65,
      bottom: 96,
      left: 64,
    };
    anchorRect.value = tiptapRect;
    await nextTick();
    expect(slashMenu.anchorRect).toBe(tiptapRect);
    expect(slashMenu.style.left).toBe("64px");
    expect(Object.fromEntries(Object.entries(writes).map(([name, spy]) => [name, spy.mock.calls.length])))
      .toEqual({ open: 0, query: 0, items: 0, selectedIndex: 0, anchorRect: 1 });
  });

  it("forwards insert-table and table-overlay details from registered elements", async () => {
    const { EditorInsertTableGrid, EditorTableOverlay } = await import("./editor/index");
    const onInsertTable = vi.fn();
    const onTableOverlayAction = vi.fn();
    const geometry: TableOverlayGeometry = {
      rowBoundaries: [0, 82, 200],
      columnBoundaries: [0, 154, 400],
      activeCell: {
        left: 154,
        top: 82,
        width: 246,
        height: 118,
        rowIndex: 1,
        columnIndex: 1,
      },
    };
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () => h("div", [
        h(EditorInsertTableGrid, {
          open: true,
          "max-rows": "3",
          "max-cols": "3",
          onInsertTable,
        }),
        h(EditorTableOverlay, {
          open: true,
          rows: "2",
          cols: "2",
          geometry,
          onTableOverlayAction,
        }),
      ]),
    });
    apps.push(app);
    app.mount(host);
    await Promise.all([
      customElements.whenDefined("ui-editor-insert-table-grid"),
      customElements.whenDefined("ui-editor-table-overlay"),
    ]);
    await flushBrowser();

    const grid = host.querySelector("ui-editor-insert-table-grid")!;
    await userEvent.click(grid.querySelector<HTMLElement>('[aria-label="3 rows by 2 columns"]')!);
    await userEvent.click(grid.querySelector<HTMLElement>("[data-insert-table]")!);
    expect(onInsertTable).toHaveBeenCalledOnce();
    expect(onInsertTable).toHaveBeenCalledWith({ rows: 3, cols: 2, withHeaderRow: true });

    const overlay = host.querySelector("ui-editor-table-overlay") as HTMLElement & {
      geometry: TableOverlayGeometry | null;
    };
    expect(overlay.geometry).toBe(geometry);
    expect(overlay.hasAttribute("geometry")).toBe(false);
    expect(overlay.querySelector<HTMLElement>("[data-control-key='row:1']")?.style.top).toBe("82px");
    await userEvent.click(
      overlay.querySelector<HTMLElement>("[data-control-key='row:1'] .ui-editor-table-overlay__handle")!,
    );
    expect(onTableOverlayAction).toHaveBeenCalledOnce();
    expect(onTableOverlayAction).toHaveBeenCalledWith({
      action: "add-row-after",
      boundaryIndex: 1,
    });
  });
});
