import { beforeEach, describe, expect, it } from "vitest";

const flushStencil = async () => {
  for (let index = 0; index < 3; index += 1) {
    await Promise.resolve();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
};

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("ui-menu anchored surface (real browser)", () => {
  it("opens in the top layer and binds itself to its named anchor", async () => {
    document.body.innerHTML = `
      <div style="overflow:auto;max-height:80px">
        <button id="page-actions" type="button">Page actions</button>
        <ui-menu for="page-actions" open>
          <ui-menu-item value="rename">Rename</ui-menu-item>
        </ui-menu>
      </div>
    `;
    await flushStencil();

    const trigger = document.getElementById("page-actions")!;
    const menu = document.querySelector<HTMLElement>("ui-menu")!;

    expect(menu.getAttribute("popover")).toBe("manual");
    expect(menu.matches(":popover-open")).toBe(true);
    expect(trigger.style.getPropertyValue("anchor-name")).toMatch(/^--ui-anchor-/u);
    expect(menu.style.getPropertyValue("position-anchor")).toBe(
      trigger.style.getPropertyValue("anchor-name"),
    );
    const triggerRect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const scrollerRect = trigger.parentElement!.getBoundingClientRect();
    expect(getComputedStyle(menu).position).toBe("fixed");
    expect(menuRect.top).toBeGreaterThanOrEqual(triggerRect.bottom);
    expect(menuRect.bottom).toBeGreaterThan(scrollerRect.bottom);
  });

  it("treats its trigger as part of the light-dismiss boundary", async () => {
    document.body.innerHTML = `
      <button id="page-actions" type="button">Page actions</button>
      <ui-menu for="page-actions" open>
        <ui-menu-item value="rename">Rename</ui-menu-item>
      </ui-menu>
    `;
    await flushStencil();

    const trigger = document.getElementById("page-actions")!;
    const menu = document.querySelector<HTMLElement>("ui-menu")!;
    let closeCount = 0;
    menu.addEventListener("close", () => { closeCount += 1; });

    trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await flushStencil();

    expect(closeCount).toBe(0);
    expect(menu.matches(":popover-open")).toBe(true);
  });

  it("uses the same top-layer anchor contract for popovers and tooltips", async () => {
    document.body.innerHTML = `
      <div style="overflow:hidden;max-height:40px">
        <button id="help" type="button">Help</button>
        <ui-popover for="help" open>Popover content</ui-popover>
        <ui-tooltip for="help" open>Tooltip content</ui-tooltip>
      </div>
    `;
    await flushStencil();

    const popover = document.querySelector<HTMLElement>("ui-popover")!;
    const tooltip = document.querySelector<HTMLElement>("ui-tooltip")!;
    expect(popover.matches(":popover-open")).toBe(true);
    expect(tooltip.matches(":popover-open")).toBe(true);
    expect(popover.style.getPropertyValue("position-anchor")).toMatch(/^--ui-anchor-/u);
    expect(tooltip.style.getPropertyValue("position-anchor")).toMatch(/^--ui-anchor-/u);
  });
});
