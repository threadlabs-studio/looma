/**
 * @looma/editor
 *
 * Confluence / Notion-like editor UI as web components (custom elements).
 * Base: Tiptap Vanilla JavaScript (Editor from @tiptap/core). Vue/React
 * adapters in @looma/vue / @looma/react wire that editor instance to these elements.
 *
 * Exports:
 * - Custom elements: ui-editor-table-context-menu, ui-editor-insert-table-grid, ui-editor-table-overlay
 * - Editor styles: import '@looma/editor/editor.css'
 * - Extension preset: import { getDefaultEditorExtensions } from '@looma/editor/extensions'
 */

import "./table-context-menu";
import "./insert-table-grid";
import "./table-overlay";

export type { TableContextMenuAction, TableContextMenuActionEventDetail } from "./table-context-menu";
export type { InsertTableEventDetail } from "./insert-table-grid";
export type { TableOverlayAction, TableOverlayActionEventDetail } from "./table-overlay";
