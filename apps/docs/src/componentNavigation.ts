export interface ComponentNavigationItem {
  readonly tag: string;
  readonly label?: string;
}

export const componentGroups = [
  {
    label: "Layout",
    items: [
      { tag: "ui-stack" },
      { tag: "ui-inline" },
      { tag: "ui-cluster" },
      { tag: "ui-grid" },
      { tag: "ui-center" },
      { tag: "ui-switcher" },
      { tag: "ui-sidebar" },
      { tag: "ui-reel" },
      { tag: "ui-separator" }
    ]
  },
  {
    label: "Overlay",
    items: [
      { tag: "ui-affordance-scope", label: "Affordance Scope" },
      { tag: "ui-dialog" },
      { tag: "ui-popover" },
      { tag: "ui-tooltip" },
      { tag: "ui-toast-region" },
      { tag: "ui-menu" },
      { tag: "ui-menu-item" },
      { tag: "ui-context-menu" }
    ]
  },
  {
    label: "Forms",
    items: [
      { tag: "ui-button", label: "Button" },
      { tag: "ui-icon-button", label: "Icon Button" },
      { tag: "ui-input" },
      { tag: "ui-combobox" },
      { tag: "ui-editable" },
      { tag: "ui-select" },
      { tag: "ui-textarea" },
      { tag: "ui-form-field" },
      { tag: "ui-checkbox" },
      { tag: "ui-switch" },
      { tag: "ui-radio-group" },
      { tag: "ui-radio" }
    ]
  },
  {
    label: "Display",
    items: [
      { tag: "ui-badge" },
      { tag: "ui-chip" },
      { tag: "ui-callout" },
      { tag: "ui-avatar" },
      { tag: "ui-avatar-group" },
      { tag: "ui-disclosure" },
      { tag: "ui-tabs" },
      { tag: "ui-tree" },
      { tag: "ui-tree-item" },
      { tag: "ui-search-result-row" },
      { tag: "ui-top-bar" }
    ]
  },
  {
    label: "Patterns",
    items: [
      { tag: "ui-floating-action-button", label: "Floating Action Button" },
      { tag: "ui-search-shell" }
    ]
  },
  {
    label: "Editor",
    items: [
      { tag: "ui-editor-toolbar" },
      { tag: "ui-editor-slash-menu" },
      { tag: "ui-editor-mention-menu" },
      { tag: "ui-editor-insert-table-grid" },
      { tag: "ui-editor-table-toolbar" },
      { tag: "ui-editor-table-context-menu" },
      { tag: "ui-editor-table-overlay" }
    ]
  }
] as const satisfies readonly {
  readonly label: string;
  readonly items: readonly ComponentNavigationItem[];
}[];

export type ComponentCategory = (typeof componentGroups)[number]["label"];
