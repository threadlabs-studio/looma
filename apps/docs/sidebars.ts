import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";
import { componentGroups } from "./src/componentNavigation";

const componentSidebarGroups = componentGroups.map(({ label, items }) => ({
  type: "category" as const,
  label,
  collapsible: false,
  items: items.map(({ tag, ...item }) => item.label
    ? { type: "doc" as const, id: `components/${tag}`, label: item.label }
    : `components/${tag}`)
}));

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
    }
  ],
  components: [
    "components",
    ...componentSidebarGroups
  ]
};

export default sidebars;
