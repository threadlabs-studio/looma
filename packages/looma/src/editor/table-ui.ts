import { NO_TABLE_CAPABILITIES, type ActiveTableUiState, type TableActionCapabilities } from "./extensions/table-commands";
import type { TableCellAlignment, TableCellBackground } from "./extensions/table-formatting";

/** What the table's controls show: the toolbar and overlay, and the selected cells' formatting and actions. */
export interface LoomaTableControls {
  readonly toolbarOpen: boolean;
  readonly overlayOpen: boolean;
  readonly alignment: TableCellAlignment;
  readonly background: TableCellBackground;
  readonly headerRow: boolean;
  readonly headerColumn: boolean;
  readonly capabilities: TableActionCapabilities;
}

export const LOOMA_TABLE_CONTROLS_CLOSED: LoomaTableControls = Object.freeze({
  toolbarOpen: false, overlayOpen: false, alignment: "left", background: null, headerRow: false, headerColumn: false,
  capabilities: Object.freeze({ ...NO_TABLE_CAPABILITIES }),
});

/**
 * The controls for the table shown: its overlay on wider screens, and the toolbar and the selection's
 * formatting only while the selection is in that table. A table that is only hovered shows its overlay
 * with nothing selected; narrow screens use the editing dock instead of the toolbar and overlay.
 */
export function tableControls(state: ActiveTableUiState, selectionInTable: boolean, narrow: boolean): LoomaTableControls {
  if (!selectionInTable) return { ...LOOMA_TABLE_CONTROLS_CLOSED, overlayOpen: !narrow };
  return {
    toolbarOpen: state.showToolbar && !narrow,
    overlayOpen: !narrow,
    alignment: state.cellAlignment,
    background: state.cellBackground,
    headerRow: state.headerRow,
    headerColumn: state.headerColumn,
    capabilities: state.capabilities,
  };
}

/** Inline controls cover the table in the editor's coordinate system. */
export const tableOverlayPlacement = (table: DOMRect, editor: DOMRect) =>
  ({ top: `${table.top - editor.top}px`, left: `${table.left - editor.left}px`, width: `${table.width}px`, height: `${table.height}px` });
