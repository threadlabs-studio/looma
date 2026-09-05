import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { loomaIconMarkup } from "@threadlabs/looma-core";
import {
  createComponentArgTypes,
  createComponentDocsParameters,
} from "../shared/componentApi";

type ReorderDetail = {
  sourceId: string;
  targetId: string;
  position: "before" | "inside" | "after";
};

function createTreeDemo() {
  const demo = document.createElement("section");
  demo.style.cssText = "max-width: 360px; padding: 24px;";
  demo.innerHTML = `
    <p style="margin: 0 0 12px; color: var(--ui-text-secondary); font-size: var(--ui-font-size-sm);">
      Drag from a grip. Edge bands insert; a folder's middle band moves inside.
    </p>
    <ui-tree label="Project pages">
      <ui-tree-item item-id="brief" label="Project brief" drag-type="page" drop-scope="root" sortable>
        <span>Project brief</span>
        <ui-icon-button slot="actions" label="Page options" size="sm" variant="ghost">
          ${loomaIconMarkup("ellipsis")}
        </ui-icon-button>
      </ui-tree-item>
      <ui-tree-item item-id="research" label="Research" drag-type="folder" drop-scope="root" accepts="page,folder" container sortable>
        <span>Research</span>
        <ui-tree-item slot="children" item-id="interviews" label="Interview notes" depth="2" drag-type="page" drop-scope="research" sortable>
          <span>Interview notes</span>
        </ui-tree-item>
      </ui-tree-item>
      <ui-tree-item item-id="decisions" label="Decisions" drag-type="folder" drop-scope="root" accepts="page,folder" container sortable>
        <span>Decisions</span>
      </ui-tree-item>
    </ui-tree>
    <p data-status role="status" style="margin: 12px 0 0; min-height: 20px; color: var(--ui-text-secondary); font-size: var(--ui-font-size-sm);">
      No move yet.
    </p>
  `;

  demo.querySelector("ui-tree")?.addEventListener("reorder", (event) => {
    const detail = (event as CustomEvent<ReorderDetail>).detail;
    const status = demo.querySelector<HTMLElement>("[data-status]");
    if (status) status.textContent = `${detail.sourceId} → ${detail.position} ${detail.targetId}`;
  });
  return demo;
}

const meta = {
  title: "Display/Tree",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-tree"),
  parameters: createComponentDocsParameters("ui-tree"),
  render: createTreeDemo,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
