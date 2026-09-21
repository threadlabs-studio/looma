export interface ComponentNavigationItem {
  readonly tag: string;
  readonly label?: string;
}

export const componentGroups = [
  {
    label: "Layout",
    items: [
      { tag: "ui-stack" },
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
      { tag: "ui-context-menu" },
      { tag: "ui-search-shell" }
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
      { tag: "ui-callout" },
      { tag: "ui-avatar" },
      { tag: "ui-avatar-group" },
      { tag: "ui-disclosure" },
      { tag: "ui-tabs" },
      { tag: "ui-tree" },
      { tag: "ui-top-bar" }
    ]
  }
] as const satisfies readonly {
  readonly label: string;
  readonly items: readonly ComponentNavigationItem[];
}[];

export const editorComponentGroup = {
  label: "Editor",
  items: [
    { tag: "ui-editor-toolbar", label: "Toolbar" },
    { tag: "ui-editor-slash-menu", label: "Slash Menu" },
    { tag: "ui-editor-mention-menu", label: "Mention Menu" },
    { tag: "ui-editor-insert-table-grid", label: "Insert Table Grid" },
    { tag: "ui-editor-table-toolbar", label: "Table Toolbar" },
    { tag: "ui-editor-table-context-menu", label: "Table Context Menu" },
    { tag: "ui-editor-table-overlay", label: "Table Overlay" }
  ]
} as const satisfies {
  readonly label: string;
  readonly items: readonly ComponentNavigationItem[];
};

export const allComponentGroups = [...componentGroups, editorComponentGroup] as const;

export type ComponentCategory = (typeof allComponentGroups)[number]["label"];
