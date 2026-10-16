import { afterEach, describe, expect, it, vi } from "vitest";
import { createToolbarTooltip, LOOMA_TOOLBAR_TOOLTIP_DELAY } from "../src/editor/toolbar-tooltip";

afterEach(() => { vi.useRealTimers(); });

describe("toolbar tooltip", () => {
  it("waits on the first button, follows the row at once while it shows, and cancels a pending wait on hide", () => {
    vi.useFakeTimers();
    const states: boolean[] = [];
    const tooltip = createToolbarTooltip((state) => states.push(state.open));
    tooltip.show("bold", "Bold", false, "Mod-b");
    expect(tooltip.state).toMatchObject({ for: "bold", label: "Bold", open: false });
    expect(tooltip.state.shortcut).not.toBe("");
    vi.advanceTimersByTime(LOOMA_TOOLBAR_TOOLTIP_DELAY);
    expect(tooltip.state.open).toBe(true);
    tooltip.show("italic", "Italic", false);
    expect(tooltip.state).toEqual({ for: "italic", label: "Italic", shortcut: "", open: true });
    tooltip.hide();
    tooltip.show("link", "Link", false);
    tooltip.hide();
    vi.advanceTimersByTime(LOOMA_TOOLBAR_TOOLTIP_DELAY);
    expect(tooltip.state.open).toBe(false);
    tooltip.show("undo", "Undo", true);
    expect(tooltip.state.open).toBe(true);
    tooltip.destroy();
    expect(states.at(-1)).toBe(true);
  });
});
