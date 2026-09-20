/**
 * Low-level Looma editor UI elements.
 *
 * This advanced entry point registers the Tiptap-independent declarative
 * component chrome without importing Looma's Tiptap extension preset or commands.
 */

import { registerLoomaPackage } from "@threadlabs/looma-core/declarative";
import { records, styles } from "../../../tools/migrate-html-next/generated/adoption/editor/registry.js";

registerLoomaPackage("editor", records, styles);

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
