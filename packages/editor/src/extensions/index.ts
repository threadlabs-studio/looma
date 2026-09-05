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
  createLoomaMentionExtension,
  DEFAULT_MENTION_RESULT_LIMIT,
  filterLoomaMentionItems,
  LoomaMentionSuggestionPluginKey,
  MAX_MENTION_RESULT_LIMIT,
  normalizeMentionResultLimit,
  type LoomaMentionItem,
  type LoomaMentionMenuSnapshot,
  type LoomaMentionOptions,
  type LoomaMentionProvider,
  type LoomaMentionProviderContext,
} from "./mention";
export {
  createLoomaSlashCommandExtension,
  getDefaultSlashCommands,
  LoomaSlashCommand,
  type LoomaSlashCommand as LoomaSlashCommandItem,
  type LoomaSlashCommandContext,
  type LoomaSlashCommandOptions,
  type LoomaSlashMenuSnapshot,
} from "./slash-command";
