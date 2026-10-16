import { describe, expect, it } from "vitest";
import { NO_TABLE_CAPABILITIES, type ActiveTableUiState } from "../src/editor/extensions/table-commands";
import { LOOMA_TABLE_CONTROLS_CLOSED, tableControls, tableOverlayPlacement, tableToolbarPlacement } from "../src/editor/table-ui";

const selection: ActiveTableUiState = {
  active: true, showToolbar: true, cellAlignment: "center", cellBackground: "blue", headerRow: true, headerColumn: false,
  capabilities: { ...NO_TABLE_CAPABILITIES, canDeleteTable: true },
};

describe("table controls", () => {
  it("shows the selection's toolbar and formatting only in its own table, and only the dock on narrow screens", () => {
    expect(tableControls(selection, true, false)).toEqual({
      toolbarOpen: true, overlayOpen: true, alignment: "center", background: "blue", headerRow: true, headerColumn: false,
      capabilities: selection.capabilities,
    });
    expect(tableControls(selection, false, false)).toEqual({ ...LOOMA_TABLE_CONTROLS_CLOSED, overlayOpen: true });
    expect(tableControls(selection, true, true)).toMatchObject({ toolbarOpen: false, overlayOpen: false, alignment: "center" });
    expect(Object.isFrozen(LOOMA_TABLE_CONTROLS_CLOSED.capabilities)).toBe(true);
  });

  it("centers the toolbar on the table within the viewport, above it when there is room, and covers the table with the overlay", () => {
    const table = { top: 200, bottom: 400, left: 100, width: 600, height: 200 } as DOMRect;
    expect(tableToolbarPlacement(table, 1280)).toEqual({ top: "148px", left: "190px", maxWidth: "420px" });
    expect(tableToolbarPlacement({ ...table, top: 40, bottom: 240, left: 0, width: 300 } as DOMRect, 375)).toEqual({ top: "252px", left: "12px", maxWidth: "351px" });
    expect(tableOverlayPlacement(table)).toEqual({ top: "200px", left: "100px", width: "600px", height: "200px" });
  });
});
