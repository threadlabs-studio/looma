import { describe, expect, it } from "vitest";

const flushStencil = async () => {
  for (let i = 0; i < 2; i += 1) {
    await Promise.resolve();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
  await Promise.resolve();
};

describe("ui-context-menu (browser)", () => {
  it("opens on right-click, selects item via click, and closes", async () => {
    document.body.innerHTML = `
      <div id="target" style="width:200px;height:100px;background:#eee;">
        Right-click me
      </div>
      <ui-context-menu>
        <ui-menu-item value="edit">Edit</ui-menu-item>
        <ui-menu-item value="delete">Delete</ui-menu-item>
      </ui-context-menu>
    `;
    await flushStencil();

    const target = document.getElementById("target");
    const contextMenu = document.querySelector("ui-context-menu") as HTMLElement & { open: boolean };
    const firstItem = contextMenu?.querySelector("ui-menu-item");
    const selectEvents: Array<{ value: string; trigger: string }> = [];
    const closeEvents: Array<{ open: boolean; reason: string; trigger: string }> = [];

    contextMenu?.addEventListener("select", (event) => {
      const custom = event as CustomEvent<{ value: string; trigger: string }>;
      selectEvents.push(custom.detail);
    });
    contextMenu?.addEventListener("close", (event) => {
      const custom = event as CustomEvent<{ open: boolean; reason: string; trigger: string }>;
      closeEvents.push(custom.detail);
    });

    // Right-click to open
    target?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 100, clientY: 50 }));
    await flushStencil();
    expect(contextMenu?.getAttribute("data-open")).toBe("");

    // Click the first menu item
    firstItem?.click();
    await flushStencil();

    expect(selectEvents).toEqual([{ value: "edit", trigger: "pointer" }]);
    expect(closeEvents.length).toBeGreaterThanOrEqual(1);
    expect(closeEvents[0].open).toBe(false);
  });

  it("opens on right-click, selects item via keyboard Enter, and closes", async () => {
    document.body.innerHTML = `
      <div id="target2" style="width:200px;height:100px;background:#eee;">
        Right-click me
      </div>
      <ui-context-menu>
        <ui-menu-item value="rename">Rename</ui-menu-item>
        <ui-menu-item value="archive">Archive</ui-menu-item>
      </ui-context-menu>
    `;
    await flushStencil();

    const target = document.getElementById("target2");
    const contextMenu = document.querySelector("ui-context-menu") as HTMLElement & { open: boolean };
    const firstItem = contextMenu?.querySelector("ui-menu-item");
    const selectEvents: Array<{ value: string; trigger: string }> = [];
    const closeEvents: Array<{ open: boolean; reason: string; trigger: string }> = [];

    contextMenu?.addEventListener("select", (event) => {
      const custom = event as CustomEvent<{ value: string; trigger: string }>;
      selectEvents.push(custom.detail);
    });
    contextMenu?.addEventListener("close", (event) => {
      const custom = event as CustomEvent<{ open: boolean; reason: string; trigger: string }>;
      closeEvents.push(custom.detail);
    });

    // Right-click to open
    target?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 100, clientY: 50 }));
    await flushStencil();
    expect(contextMenu?.getAttribute("data-open")).toBe("");

    // Activate via keyboard Enter
    firstItem?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true }));
    await flushStencil();

    expect(selectEvents).toEqual([{ value: "rename", trigger: "keyboard" }]);
    expect(closeEvents.length).toBeGreaterThanOrEqual(1);
    expect(closeEvents[0].open).toBe(false);
  });

  it("closes on Escape key", async () => {
    document.body.innerHTML = `
      <div id="target3" style="width:200px;height:100px;background:#eee;">
        Right-click me
      </div>
      <ui-context-menu>
        <ui-menu-item value="edit">Edit</ui-menu-item>
      </ui-context-menu>
    `;
    await flushStencil();

    const target = document.getElementById("target3");
    const contextMenu = document.querySelector("ui-context-menu") as HTMLElement & { open: boolean };
    const closeEvents: Array<{ open: boolean; reason: string; trigger: string }> = [];

    contextMenu?.addEventListener("close", (event) => {
      const custom = event as CustomEvent<{ open: boolean; reason: string; trigger: string }>;
      closeEvents.push(custom.detail);
    });

    // Open via right-click
    target?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 100, clientY: 50 }));
    await flushStencil();
    expect(contextMenu?.getAttribute("data-open")).toBe("");

    // Close via Escape
    contextMenu?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flushStencil();

    expect(closeEvents.length).toBeGreaterThanOrEqual(1);
    expect(closeEvents[0].open).toBe(false);
    expect(closeEvents[0].reason).toBe("escape");
  });

  it("keeps disabled items from selecting or closing the menu", async () => {
    document.body.innerHTML = `
      <div id="target4" style="width:200px;height:100px;background:#eee;">
        Right-click me
      </div>
      <ui-context-menu>
        <ui-menu-item value="delete" disabled>Delete</ui-menu-item>
      </ui-context-menu>
    `;
    await flushStencil();

    const target = document.getElementById("target4");
    const contextMenu = document.querySelector("ui-context-menu") as HTMLElement;
    const disabledItem = contextMenu?.querySelector("ui-menu-item");
    const selectEvents: Array<{ value: string; trigger: string }> = [];
    const closeEvents: Array<{ open: boolean; reason: string; trigger: string }> = [];

    contextMenu?.addEventListener("select", (event) => {
      const custom = event as CustomEvent<{ value: string; trigger: string }>;
      selectEvents.push(custom.detail);
    });
    contextMenu?.addEventListener("close", (event) => {
      const custom = event as CustomEvent<{ open: boolean; reason: string; trigger: string }>;
      closeEvents.push(custom.detail);
    });

    target?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 100, clientY: 50 }));
    await flushStencil();
    expect(contextMenu?.getAttribute("data-open")).toBe("");

    disabledItem?.click();
    disabledItem?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true }));
    await flushStencil();

    expect(selectEvents).toEqual([]);
    expect(closeEvents).toEqual([]);
    expect(contextMenu?.getAttribute("data-open")).toBe("");
  });
});
