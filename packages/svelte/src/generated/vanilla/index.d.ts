/** Inputs accepted by generated DOM factories before lifecycle attachment. */
export interface VanillaComponentOptions {
  readonly attributes?: Readonly<Record<string, string | number | boolean | null | undefined>>;
  readonly children?: readonly Node[];
  readonly slots?: Readonly<Record<string, readonly Node[]>>;
  readonly [name: string]: unknown;
}

export declare function createUiAffordanceScope(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiAvatarGroup(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiAvatar(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiBadge(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiButton(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiCallout(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiCheckbox(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiCombobox(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiContextMenu(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiDialog(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiDisclosure(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiEditable(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiFormField(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiIconButton(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiInput(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiMenuItem(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiMenu(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiPopover(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiRadioGroup(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiRadio(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiSearchResultRow(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiSearchShell(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiSelect(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiSwitch(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiTabs(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiTextarea(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiToastRegion(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiTooltip(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiTopBar(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiTreeItem(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiTree(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiCenter(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiGrid(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiInline(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiReel(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiSeparator(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiSidebar(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiStack(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiSwitcher(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiEditorInsertTableGrid(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiEditorMentionMenu(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiEditorSlashMenu(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiEditorTableContextMenu(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiEditorTableOverlay(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiEditorTableToolbar(options?: VanillaComponentOptions): HTMLElement;
export declare function createUiEditorToolbar(options?: VanillaComponentOptions): HTMLElement;

export type GeneratedTagName = "ui-affordance-scope" | "ui-avatar-group" | "ui-avatar" | "ui-badge" | "ui-button" | "ui-callout" | "ui-checkbox" | "ui-combobox" | "ui-context-menu" | "ui-dialog" | "ui-disclosure" | "ui-editable" | "ui-form-field" | "ui-icon-button" | "ui-input" | "ui-menu-item" | "ui-menu" | "ui-popover" | "ui-radio-group" | "ui-radio" | "ui-search-result-row" | "ui-search-shell" | "ui-select" | "ui-switch" | "ui-tabs" | "ui-textarea" | "ui-toast-region" | "ui-tooltip" | "ui-top-bar" | "ui-tree-item" | "ui-tree" | "ui-center" | "ui-grid" | "ui-inline" | "ui-reel" | "ui-separator" | "ui-sidebar" | "ui-stack" | "ui-switcher" | "ui-editor-insert-table-grid" | "ui-editor-mention-menu" | "ui-editor-slash-menu" | "ui-editor-table-context-menu" | "ui-editor-table-overlay" | "ui-editor-table-toolbar" | "ui-editor-toolbar";
export declare const factoryByTag: Readonly<Record<GeneratedTagName, (options?: VanillaComponentOptions) => HTMLElement>>;
