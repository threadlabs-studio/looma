import { describe, expect, it } from "vitest";
import { NO_TABLE_CAPABILITIES, type ActiveTableUiState } from "../src/editor/extensions/table-commands";
import { LOOMA_TABLE_CONTROLS_CLOSED, tableControls, tableOverlayPlacement } from "../src/editor/table-ui";

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

  it("places inline controls relative to the editable document", () => {
    const table = { top: 200, left: 100, width: 600, height: 200 } as DOMRect;
    expect(tableOverlayPlacement(table, { top: 50, left: 20 } as DOMRect)).toEqual({ top: "150px", left: "80px", width: "600px", height: "200px" });
  });
});
