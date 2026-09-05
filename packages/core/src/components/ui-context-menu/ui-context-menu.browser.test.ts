import axe from "axe-core";
import { beforeEach, describe, expect, it } from "vitest";

const flushStencil = async () => {
  for (let i = 0; i < 3; i += 1) {
    await Promise.resolve();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
  await Promise.resolve();
};

const renderContextMenu = async () => {
  document.body.innerHTML = `
    <main>
      <div id="document-row">
        <ui-context-menu for="document-row">
          <button slot="trigger" type="button">Document actions</button>
          <ui-menu-item value="rename">Rename</ui-menu-item>
          <ui-menu-item value="archive">Archive</ui-menu-item>
          <ui-menu-item value="delete" disabled>Delete</ui-menu-item>
        </ui-context-menu>
      </div>
      <button id="outside" type="button">Outside</button>
    </main>
  `;
  await flushStencil();

  return {
    contextMenu: document.querySelector("ui-context-menu") as HTMLElement,
    trigger: document.querySelector<HTMLButtonElement>('[slot="trigger"]')!,
    firstItem: document.querySelector<HTMLElement>('ui-menu-item[value="rename"]')!,
    disabledItem: document.querySelector<HTMLElement>('ui-menu-item[value="delete"]')!,
    target: document.getElementById("document-row")!,
    outside: document.getElementById("outside") as HTMLButtonElement,
  };
};

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("ui-context-menu release interactions (real browser)", () => {
  it("opens from its visible keyboard trigger, selects, and returns focus", async () => {
    const { contextMenu, trigger, firstItem } = await renderContextMenu();
    const selected: Array<{ value: string; trigger: string }> = [];
    contextMenu.addEventListener("select", (event) => {
      selected.push((event as CustomEvent<{ value: string; trigger: string }>).detail);
    });

    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await flushStencil();

    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const surface = contextMenu.shadowRoot?.querySelector<HTMLElement>(".menu")!;
    expect(surface.hasAttribute("data-open")).toBe(true);
    expect(surface.getAttribute("popover")).toBe("manual");
    expect(surface.matches(":popover-open")).toBe(true);
    expect(document.activeElement).toBe(firstItem);

    firstItem.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true }));
    await flushStencil();

    expect(selected).toEqual([{ value: "rename", trigger: "keyboard" }]);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("opens from a touch-capable visible trigger and keeps right-click supplemental", async () => {
    const { contextMenu, trigger, target } = await renderContextMenu();
    const opened: Array<{ trigger: string }> = [];
    contextMenu.addEventListener("open", (event) => {
      opened.push((event as CustomEvent<{ trigger: string }>).detail);
    });

    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await flushStencil();
    expect(contextMenu.shadowRoot?.querySelector(".menu")?.hasAttribute("data-open")).toBe(true);

    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await flushStencil();
    target.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 120, clientY: 80 }));
    await flushStencil();

    expect(opened.map((detail) => detail.trigger)).toEqual(["pointer", "pointer"]);
    const menu = contextMenu.shadowRoot?.querySelector<HTMLElement>(".menu");
    expect(menu?.style.left).toBe("120px");
    expect(menu?.style.top).toBe("84px");
  });

  it("cancels on Escape and outside press with focus return", async () => {
    const { contextMenu, trigger, outside } = await renderContextMenu();
    const closeReasons: string[] = [];
    contextMenu.addEventListener("close", (event) => {
      closeReasons.push((event as CustomEvent<{ reason: string }>).detail.reason);
    });

    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await flushStencil();
    contextMenu.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flushStencil();
    expect(document.activeElement).toBe(trigger);

    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await flushStencil();
    outside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await flushStencil();

    expect(closeReasons).toEqual(["escape", "light-dismiss"]);
    expect(document.activeElement).toBe(trigger);
  });

  it("does not select disabled items or close the menu", async () => {
    const { contextMenu, trigger, disabledItem } = await renderContextMenu();
    const selected: unknown[] = [];
    contextMenu.addEventListener("select", (event) => selected.push((event as CustomEvent).detail));

    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await flushStencil();
    disabledItem.click();
    disabledItem.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true }));
    await flushStencil();

    expect(selected).toEqual([]);
    expect(contextMenu.shadowRoot?.querySelector(".menu")?.hasAttribute("data-open")).toBe(true);
  });
});

describe("representative core accessibility (real browser)", () => {
  it("passes automated checks for form, menu, dialog, search, and top-bar surfaces", async () => {
    document.body.innerHTML = `
      <main id="qualification-surface">
        <ui-top-bar>
          <h1>Workspace</h1>
          <button slot="actions" type="button">Account</button>
        </ui-top-bar>
        <ui-form-field required>
          <label>Email</label>
          <input type="email" required />
          <small data-slot="help">Used for release access.</small>
        </ui-form-field>
        <ui-context-menu>
          <button slot="trigger" type="button">Page actions</button>
          <ui-menu-item value="open">Open</ui-menu-item>
        </ui-context-menu>
        <ui-search-shell>
          <label slot="search">Search <input type="search" /></label>
          <div slot="status" role="status">1 result</div>
          <div slot="body"><ui-search-result-row><span slot="title">Release notes</span></ui-search-result-row></div>
        </ui-search-shell>
        <ui-dialog open>
          <div aria-labelledby="dialog-title">
            <h2 id="dialog-title">Confirm release</h2>
            <button type="button">Cancel</button>
          </div>
        </ui-dialog>
      </main>
    `;
    await flushStencil();

    const result = await axe.run(document.getElementById("qualification-surface")!);
    expect(result.violations, result.violations.map((violation) => violation.id).join(", ")).toEqual([]);
  });
});
