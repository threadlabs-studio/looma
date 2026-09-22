/**
 * The editor components' framework-neutral event and geometry contracts. The components emit
 * intent and never change a document; an integration translates intent to Tiptap, another editor,
 * or application state.
 */

export type { TableContextMenuAction, TableContextMenuActionEventDetail } from "./table-context-menu";
export {
  TABLE_CELL_BACKGROUND_OPTIONS,
  TABLE_CELL_BACKGROUND_PRESETS,
  type TableCellBackgroundAction,
} from "./table-backgrounds";
export type { InsertTableEventDetail } from "./insert-table-grid";
export type {
  MentionMenuHighlightEventDetail,
  MentionMenuSelectEventDetail,
} from "./mention-menu";
export {
  measureTableOverlayGeometry,
  resolveTableCellAt,
  type ActiveCellRect,
  type TableInsertionAction,
  type TableOverlayAction,
  type TableOverlayActionEventDetail,
  type TableOverlayGeometry,
} from "./table-overlay";
export type { TableContextMenuActionEventDetail as TableToolbarActionEventDetail } from "./table-context-menu";
export type {
  SlashMenuAnchorRect,
  SlashMenuHighlightEventDetail,
  SlashMenuItem,
  SlashMenuSelectEventDetail,
} from "./slash-menu";
