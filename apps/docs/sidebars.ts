import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docs: [
    "getting-started",
    "release-1-support",
    {
      type: "category",
      label: "Foundations",
      items: [
        "architecture",
        "conventions",
        "tokens",
        "overlay-contract",
        "adapter-parity",
        "docs-api-sync",
        "component-library-audit"
      ]
    },
    {
      type: "category",
      label: "Layout",
      items: [
        "components/ui-stack",
        "components/ui-inline",
        "components/ui-cluster",
        "components/ui-grid",
        "components/ui-center",
        "components/ui-switcher",
        "components/ui-sidebar",
        "components/ui-reel",
        "components/ui-separator"
      ]
    },
    {
      type: "category",
      label: "Overlay",
      items: [
        "components/ui-affordance-scope",
        "components/ui-dialog",
        "components/ui-popover",
        "components/ui-tooltip",
        "components/ui-toast-region",
        "components/ui-menu",
        "components/ui-menu-item",
        "components/ui-context-menu"
      ]
    },
    {
      type: "category",
      label: "Forms",
      items: [
        "components/ui-button",
        "components/ui-icon-button",
        "components/ui-input",
        "components/ui-select",
        "components/ui-textarea",
        "components/ui-form-field",
        "components/ui-checkbox",
        "components/ui-switch",
        "components/ui-radio-group",
        "components/ui-radio"
      ]
    },
    {
      type: "category",
      label: "Recipes",
      items: [
        "components/ui-floating-action-button",
        "components/ui-search-shell",
        "components/ui-search-result-row",
        "components/ui-top-bar"
      ]
    },
    {
      type: "category",
      label: "Display",
      items: [
        "components/ui-badge",
        "components/ui-avatar",
        "components/ui-avatar-group",
        "components/ui-disclosure",
        "components/ui-tabs",
        "components/ui-tree",
        "components/ui-tree-item"
      ]
    },
    {
      type: "category",
      label: "Editor",
      items: [
        "components/ui-editor-toolbar",
        "components/ui-editor-slash-menu",
        "components/ui-editor-insert-table-grid",
        "components/ui-editor-table-toolbar",
        "components/ui-editor-table-context-menu",
        "components/ui-editor-table-overlay"
      ]
    }
  ]
};

export default sidebars;
