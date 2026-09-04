import { userEvent } from "@vitest/browser/context";
import type { Editor } from "@tiptap/core";
import type { TableOverlayGeometry } from "@threadlabs/looma-editor";
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
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(1280);
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

    editor!.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: false }).run();
    await flushBrowser();
    const table = host.querySelector(".ProseMirror table")!;
    expect(table.querySelectorAll("tr")).toHaveLength(2);
    expect((table as HTMLTableElement).style.minWidth).toBe("224px");
    expect(document.querySelector("ui-editor-table-toolbar")).toBeTruthy();
    expect(document.querySelector("ui-editor-table-overlay")).toBeTruthy();
    expect(document.querySelector(".looma-editor__table-overlay-shell")?.hasAttribute("aria-hidden"))
      .toBe(false);

    const overlay = document.querySelector("ui-editor-table-overlay") as HTMLElement & {
      geometry: TableOverlayGeometry | null;
    };
    expect(overlay.geometry?.rowBoundaries).toHaveLength(3);
    expect(overlay.geometry?.columnBoundaries).toHaveLength(3);

    const firstCell = table.querySelector<HTMLTableCellElement>("th, td")!;
    const firstCellRect = firstCell.getBoundingClientRect();
    await userEvent.hover(firstCell, {
      position: { x: firstCellRect.width - 2, y: firstCellRect.height / 2 },
    } as Parameters<typeof userEvent.hover>[1]);
    await flushBrowser();
    const resizeHandle = table.querySelector<HTMLElement>(".column-resize-handle")!;
    expect(resizeHandle).toBeTruthy();
    expect(getComputedStyle(resizeHandle).cursor).toBe("col-resize");
    expect(resizeHandle.getBoundingClientRect().width).toBeGreaterThanOrEqual(10);
    const resizeRect = resizeHandle.getBoundingClientRect();
    const resizeX = resizeRect.left + (resizeRect.width / 2);
    const resizeY = firstCellRect.top + (firstCellRect.height / 2);
    resizeHandle.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true,
      clientX: resizeX,
      clientY: resizeY,
      pointerType: "mouse",
    }));
    resizeHandle.dispatchEvent(new MouseEvent("mousedown", {
      bubbles: true,
      clientX: resizeX,
      clientY: resizeY,
      button: 0,
      buttons: 1,
    }));
    window.dispatchEvent(new MouseEvent("mousemove", {
      clientX: resizeX + 48,
      clientY: resizeY,
      buttons: 1,
    }));
    window.dispatchEvent(new MouseEvent("mouseup", {
      clientX: resizeX + 48,
      clientY: resizeY,
      button: 0,
    }));
    window.dispatchEvent(new PointerEvent("pointerup", {
      clientX: resizeX + 48,
      clientY: resizeY,
      pointerType: "mouse",
    }));
    await flushBrowser();
    expect(editor!.getJSON().content?.[1]?.content?.[0]?.content?.[0]?.attrs?.colwidth?.[0])
      .toBeGreaterThan(firstCellRect.width);

    const currentTable = host.querySelector<HTMLTableElement>(".ProseMirror table")!;
    const secondCell = currentTable.querySelectorAll<HTMLTableCellElement>("th, td")[1]!;
    expect([secondCell.closest("tr")?.rowIndex, secondCell.cellIndex]).toEqual([0, 1]);
    await userEvent.hover(secondCell);
    secondCell.dispatchEvent(new PointerEvent("pointerover", {
      bubbles: true,
      pointerType: "mouse",
    }));
    await flushBrowser();
    const currentOverlay = document.querySelector<HTMLElement>("ui-editor-table-overlay")!;
    const cellMenu = currentOverlay.querySelector<HTMLButtonElement>("[data-action='open-cell-menu']")!;
    expect(cellMenu).toBeTruthy();
    const overlayActions = vi.fn();
    currentOverlay.addEventListener("looma-editor-table-overlay-action", overlayActions);
    await userEvent.click(cellMenu);
    await flushBrowser();
    expect(overlayActions).toHaveBeenCalledOnce();
    expect((overlayActions.mock.calls[0]?.[0] as CustomEvent).detail).toMatchObject({
      action: "open-cell-menu",
      rowIndex: 0,
      columnIndex: 1,
    });
    const contextMenu = document.querySelector<HTMLElement>("ui-editor-table-context-menu")!;
    expect(contextMenu).toBeTruthy();
    await userEvent.click(
      contextMenu.querySelector<HTMLButtonElement>("[data-action='background-yellow']")!,
    );
    await flushBrowser();
    expect(
      editor!.getJSON().content?.[1]?.content?.[0]?.content
        ?.map((cell) => cell.attrs?.backgroundColor ?? null),
    ).toEqual([null, "#fef3c7"]);

    const addRow = document.querySelector<HTMLElement>(
      'ui-editor-table-toolbar [data-action="add-row-after"]',
    )!;
    await userEvent.click(addRow);
    await flushBrowser();
    expect(currentTable.querySelectorAll("tr")).toHaveLength(3);
    expect(updates).toHaveBeenCalled();
  });

  it("uses one mobile dock and lets table users return to formatting", async () => {
    defineCustomElements();
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(375);
    vi.spyOn(window, "visualViewport", "get").mockReturnValue({
      width: 375,
      height: 420,
      offsetLeft: 0,
      offsetTop: 96,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as VisualViewport);
    const host = document.createElement("div");
    document.body.append(host);

    let editor: Editor | null = null;
    const app = createApp({
      render: () => h(LoomaEditor, {
        modelValue: {
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Mobile" }] }],
        },
        onReady: (instance: Editor) => { editor = instance; },
      }),
    });
    apps.push(app);
    app.mount(host);
    await customElements.whenDefined("ui-editor-table-toolbar");
    await flushBrowser();

    editor!.chain().focus().setTextSelection({ from: 1, to: 3 }).run();
    await flushBrowser();
    expect(document.querySelectorAll(".looma-editor__mobile-toolbar-shell")).toHaveLength(1);
    expect(document.querySelector('.looma-editor__mobile-toolbar-shell[data-mode="formatting"]')).toBeTruthy();
    expect(document.querySelector('.looma-editor__mobile-toolbar-shell ui-icon-button[title="Bold"]')).toBeTruthy();

    editor!.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run();
    await flushBrowser();
    expect(document.querySelectorAll(".looma-editor__mobile-toolbar-shell")).toHaveLength(1);
    expect(document.querySelector('.looma-editor__mobile-toolbar-shell[data-mode="table"]')).toBeTruthy();
    expect(document.querySelector('.looma-editor__mobile-toolbar-shell ui-editor-table-toolbar')).toBeTruthy();
    expect(document.querySelector(".looma-editor__table-overlay-shell")).toBeNull();

    const formatting = document.querySelector<HTMLButtonElement>(".looma-editor__mobile-toolbar-back")!;
    expect(formatting.textContent).toContain("Formatting");
    await userEvent.click(formatting);
    await flushBrowser();
    expect(document.querySelector('.looma-editor__mobile-toolbar-shell[data-mode="formatting"]')).toBeTruthy();
    expect(document.querySelector('.looma-editor__mobile-toolbar-shell ui-editor-table-toolbar')).toBeNull();
  });
});
