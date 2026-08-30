/**
 * @threadlabs/looma-editor/extensions — extension preset and table command helpers.
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
  getActiveTableCellBackground,
  LoomaTableCell,
  LoomaTableHeader,
  setActiveTableCellAlignment,
  setActiveTableCellBackground,
  TABLE_CELL_BACKGROUND_PRESETS,
  type TableCellAlignment,
  type TableCellBackground,
} from "./table-formatting";
