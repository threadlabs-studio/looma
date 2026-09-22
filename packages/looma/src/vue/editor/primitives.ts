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
  TableOverlayActionEventDetail,
} from "@threadlabs/looma/editor";

export {
  EditorInsertTableGrid,
  EditorMentionMenu,
  EditorSlashMenu,
  EditorTableContextMenu,
  EditorTableOverlay,
  EditorTableToolbar,
  EditorToolbar,
} from "@threadlabs/looma/vue";

/** The editor components' event details, by event name. */
export interface VueEditorAdapterEventMap {
  highlight: MentionMenuHighlightEventDetail | SlashMenuHighlightEventDetail;
  select: MentionMenuSelectEventDetail | SlashMenuSelectEventDetail;
  action: TableContextMenuActionEventDetail | TableOverlayActionEventDetail;
  insert: InsertTableEventDetail;
}

/** Each Vue editor component's element tag, for tooling that enumerates them. */
export const EDITOR_ADAPTER_COMPONENT_TAG_MAP = {
  EditorToolbar: "ui-editor-toolbar",
  EditorSlashMenu: "ui-editor-slash-menu",
  EditorMentionMenu: "ui-editor-mention-menu",
  EditorTableContextMenu: "ui-editor-table-context-menu",
  EditorTableToolbar: "ui-editor-table-toolbar",
  EditorInsertTableGrid: "ui-editor-insert-table-grid",
  EditorTableOverlay: "ui-editor-table-overlay",
} as const;
