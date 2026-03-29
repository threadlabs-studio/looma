/**
 * @looma/editor/extensions — extension preset and table command helpers.
 */

export {
  getDefaultEditorExtensions,
  type DefaultEditorExtensionsOptions,
} from "./preset";
export {
  handleTableOverlayAction,
  insertTableAtRange,
  normalizeActiveTableColumnWidths,
  type InsertTableAtRangeOptions,
} from "./table-commands";
export {
  LoomaTable,
  getActiveTableCellAlignment,
  LoomaTableCell,
  LoomaTableHeader,
  setActiveTableCellAlignment,
  type TableCellAlignment,
} from "./table-formatting";
