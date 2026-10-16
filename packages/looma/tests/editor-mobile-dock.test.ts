import { describe, expect, it, vi } from "vitest";
import { createMobileDock, mobileDockPlacement, usesMobileDock } from "../src/editor/mobile-dock";

describe("mobile dock", () => {
  it("is used up to 767px wide and sits on the visual viewport's bottom edge, never above its top", () => {
    expect([usesMobileDock(767), usesMobileDock(768)]).toEqual([true, false]);
    const viewport = { left: 0, top: 120, right: 375, bottom: 420, width: 375, height: 300 };
    expect(mobileDockPlacement(viewport, 56)).toEqual({ left: 0, top: 364, width: 375 });
    expect(mobileDockPlacement({ ...viewport, bottom: 150, height: 30 }, 56)).toEqual({ left: 0, top: 120, width: 375 });
  });

  it("shows table controls for an active table until the author goes back to formatting, which lasts until no table is active", () => {
    const changes = vi.fn();
    const dock = createMobileDock(changes);
    dock.tableActive();
    expect(dock.mode).toBe("table");
    dock.showFormatting();
    dock.tableActive();
    expect(dock.mode).toBe("formatting");
    dock.tableInactive();
    dock.tableActive();
    expect(dock.mode).toBe("table");
    expect(changes.mock.calls).toEqual([["table"], ["formatting"], ["table"]]);
  });
});
