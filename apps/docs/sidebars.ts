import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docs: [
    "getting-started",
    {
      type: "category",
      label: "Foundations",
      items: ["architecture", "conventions", "tokens", "overlay-contract", "adapter-parity"]
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
      label: "Primitives",
      items: [
        "components/ui-disclosure",
        "components/ui-tabs",
        "components/ui-dialog",
        "components/ui-popover",
        "components/ui-menu",
        "components/ui-menu-item"
      ]
    },
    {
      type: "category",
      label: "Essentials",
      items: ["components/ui-button", "components/ui-input", "components/ui-form-field"]
    }
  ]
};

export default sidebars;
