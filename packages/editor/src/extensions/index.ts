/**
 * @threadlabs/looma-editor/extensions — extension preset and table command helpers.
 */

export {
  getDefaultEditorExtensions,
  getLoomaTableExtensions,
  LoomaTableKit,
  type DefaultEditorExtensionsOptions,
} from "./preset";
export {
  getActiveTableUiState,
  handleTableAction,
  handleTableOverlayAction,
  insertTableAtRange,
  normalizeActiveTableColumnWidths,
  shouldShowTextFormattingToolbar,
  type ActiveTableUiState,
  type InsertTableAtRangeOptions,
  type TableActionCapabilities,
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
export {
  createLoomaSlashCommandExtension,
  getDefaultSlashCommands,
  LoomaSlashCommand,
  type LoomaSlashCommand as LoomaSlashCommandItem,
  type LoomaSlashCommandContext,
  type LoomaSlashCommandOptions,
  type LoomaSlashMenuSnapshot,
} from "./slash-command";
