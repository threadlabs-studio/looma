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
  EditorBlockActions,
  EditorChipEditor,
  EditorCodeLanguage,
  EditorFootnoteEditor,
  EditorImageToolbar,
  EditorInsertTableGrid,
  EditorLinkCard,
  EditorLinkForm,
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
  action: TableContextMenuActionEventDetail | { action: "insert-below" | "duplicate" | "delete" };
  insert: InsertTableEventDetail;
  placement: { placement: "block" | "center" | "wrap-left" | "wrap-right" };
  describe: { alt: string };
  delete: Record<string, never>;
  edit: Record<string, never>;
  remove: Record<string, never>;
  destination: { value: string };
  text: { text: string };
  "new-tab": { newTab: boolean };
  choose: { id: string };
  clear: Record<string, never>;
  save: Record<string, never>;
  dismiss: Record<string, never>;
  language: { value: string };
  label: { label: string };
  color: { color: "neutral" | "blue" | "green" | "yellow" | "red" | "purple" };
  done: Record<string, never>;
  go: Record<string, never>;
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
  EditorImageToolbar: "ui-editor-image-toolbar",
  EditorLinkCard: "ui-editor-link-card",
  EditorLinkForm: "ui-editor-link-form",
  EditorBlockActions: "ui-editor-block-actions",
  EditorCodeLanguage: "ui-editor-code-language",
  EditorChipEditor: "ui-editor-chip-editor",
  EditorFootnoteEditor: "ui-editor-footnote-editor",
} as const;
