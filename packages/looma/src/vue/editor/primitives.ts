/**
 * The editor components, as Vue components. They are the converted components from
 * `@threadlabs/looma/vue`, re-exported beside the editor that composes them.
 */
import type {
  InsertTableEventDetail,
  MentionMenuHighlightEventDetail,
  MentionMenuSelectEventDetail,
  SlashMenuHighlightEventDetail,
  SlashMenuSelectEventDetail,
  TableContextMenuActionEventDetail,
} from "@threadlabs/looma/editor";

export {
  EditorInsertTableGrid,
  EditorMentionMenu,
  EditorMentionMenuItem,
  EditorSlashMenu,
  EditorSlashMenuGroup,
  EditorSlashMenuItem,
  EditorTableContextMenu,
  EditorTableOverlay,
  EditorTableToolbar,
  EditorToolbar,
} from "@threadlabs/looma/vue";

/** The editor components' event details, by event name. */
export interface VueEditorAdapterEventMap {
  highlight: MentionMenuHighlightEventDetail | SlashMenuHighlightEventDetail;
  select: MentionMenuSelectEventDetail | SlashMenuSelectEventDetail;
  action: TableContextMenuActionEventDetail;
  insert: InsertTableEventDetail;
  "add-row-before": { boundaryIndex: number };
  "add-row-after": { boundaryIndex: number };
  "add-column-before": { boundaryIndex: number };
  "add-column-after": { boundaryIndex: number };
  "select-row": { rowIndex: number; columnIndex: number };
  "select-column": { rowIndex: number; columnIndex: number };
  "open-cell-menu": { rowIndex: number; columnIndex: number; anchor: { left: number; top: number; right: number; bottom: number } };
  "open-row-menu": { rowIndex: number; columnIndex: number; anchor: { left: number; top: number; right: number; bottom: number } };
  "open-column-menu": { rowIndex: number; columnIndex: number; anchor: { left: number; top: number; right: number; bottom: number } };
}

/** Each Vue editor component's element tag, for tooling that enumerates them. */
export const EDITOR_ADAPTER_COMPONENT_TAG_MAP = {
  EditorToolbar: "ui-editor-toolbar",
  EditorSlashMenu: "ui-editor-slash-menu",
  EditorMentionMenu: "ui-editor-mention-menu",
  EditorMentionMenuItem: "ui-editor-mention-menu-item",
  EditorSlashMenuGroup: "ui-editor-slash-menu-group",
  EditorSlashMenuItem: "ui-editor-slash-menu-item",
  EditorTableContextMenu: "ui-editor-table-context-menu",
  EditorTableToolbar: "ui-editor-table-toolbar",
  EditorInsertTableGrid: "ui-editor-insert-table-grid",
  EditorTableOverlay: "ui-editor-table-overlay",
} as const;
