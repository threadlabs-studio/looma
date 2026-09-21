/** Intent contracts shared by declarative table menus and editor adapters. */

import type { TableCellBackgroundAction } from "./table-backgrounds";

/**
 * Complete intent vocabulary emitted by table chrome for an adapter to execute.
 * Keeping this as data prevents the reusable menu from importing or mutating a
 * particular editor implementation.
 */
export type TableContextMenuAction =
  | "align-left"
  | "align-center"
  | "align-right"
  | TableCellBackgroundAction
  | "add-row-before"
  | "add-row-after"
  | "add-column-before"
  | "add-column-after"
  | "delete-row"
  | "delete-column"
  | "delete-table"
  | "clear-cells"
  | "merge-cells"
  | "split-cell";

/** Adapter-facing payload that keeps the menu independent of editor commands. */
export interface TableContextMenuActionEventDetail {
  action: TableContextMenuAction;
}
