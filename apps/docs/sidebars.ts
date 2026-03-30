import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docs: [
    "getting-started",
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
        "components/ui-separator"
      ]
    },
    {
      type: "category",
      label: "Overlay",
      items: [
        "components/ui-dialog",
        "components/ui-popover",
        "components/ui-tooltip",
        "components/ui-toast-region",
        "components/ui-menu",
        "components/ui-menu-item"
      ]
    },
    {
      type: "category",
      label: "Forms",
      items: [
        "components/ui-button",
        "components/ui-icon-button",
        "components/ui-input",
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
        "components/ui-tabs"
      ]
    }
  ]
};

export default sidebars;
