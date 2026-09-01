/**
 * @threadlabs/looma-editor
 *
 * Confluence / Notion-like editor UI as web components (custom elements).
 * Base: Tiptap Vanilla JavaScript (Editor from @tiptap/core). The supported R1
 * adapter in @threadlabs/looma-vue wires that editor instance to these elements.
 *
 * Exports:
 * - Custom elements: ui-editor-toolbar, ui-editor-table-context-menu, ui-editor-table-toolbar, ui-editor-insert-table-grid, ui-editor-table-overlay, ui-editor-slash-menu
 * - Editor styles: import '@threadlabs/looma-editor/editor.css'
 * - Extension preset: import { getDefaultEditorExtensions } from '@threadlabs/looma-editor/extensions'
 */

import "./table-context-menu";
import "./table-toolbar";
import "./insert-table-grid";
import "./table-overlay";
import "./slash-menu";
import "./toolbar";

export type { TableContextMenuAction, TableContextMenuActionEventDetail } from "./table-context-menu";
export type { InsertTableEventDetail } from "./insert-table-grid";
export type { TableOverlayAction, TableOverlayActionEventDetail } from "./table-overlay";
export type { TableContextMenuActionEventDetail as TableToolbarActionEventDetail } from "./table-context-menu";
export type {
  SlashMenuHighlightEventDetail,
  SlashMenuItem,
  SlashMenuSelectEventDetail,
} from "./slash-menu";
