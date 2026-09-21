// Package registration supplies live-HTML lowering; these generated adapters render native roots
// directly and attach the same declarative definitions without a custom-element bridge.
import "@threadlabs/looma-core";
import "@threadlabs/looma-layout";
import "@threadlabs/looma-editor/ui";

export * from "./generated";

export const ADAPTER_COMPONENT_TAG_MAP = {
  Stack: "ui-stack", Inline: "ui-inline", Grid: "ui-grid",
  Center: "ui-center", Switcher: "ui-switcher", Sidebar: "ui-sidebar", Reel: "ui-reel",
  Separator: "ui-separator", Disclosure: "ui-disclosure", Editable: "ui-editable",
  Tabs: "ui-tabs", Dialog: "ui-dialog", Popover: "ui-popover", Menu: "ui-menu",
  MenuItem: "ui-menu-item", ContextMenu: "ui-context-menu", AffordanceScope: "ui-affordance-scope",
  Button: "ui-button", IconButton: "ui-icon-button", Input: "ui-input", Select: "ui-select",
  Textarea: "ui-textarea", FormField: "ui-form-field", Tooltip: "ui-tooltip",
  ToastRegion: "ui-toast-region", Checkbox: "ui-checkbox", Switch: "ui-switch",
  RadioGroup: "ui-radio-group", Radio: "ui-radio", Badge: "ui-badge",
  Callout: "ui-callout", Avatar: "ui-avatar", AvatarGroup: "ui-avatar-group",
  SearchShell: "ui-search-shell",
  SearchResultRow: "ui-search-result-row", TopBar: "ui-top-bar", Tree: "ui-tree",
  TreeItem: "ui-tree-item", Combobox: "ui-combobox", EditorToolbar: "ui-editor-toolbar",
  EditorSlashMenu: "ui-editor-slash-menu", EditorMentionMenu: "ui-editor-mention-menu",
  EditorTableContextMenu: "ui-editor-table-context-menu", EditorTableToolbar: "ui-editor-table-toolbar",
  EditorInsertTableGrid: "ui-editor-insert-table-grid", EditorTableOverlay: "ui-editor-table-overlay",
} as const;

export const REACT_ADAPTER_NOTE =
  "Generated declarative adapter: renders a native root and attaches the framework-neutral Looma contract.";
