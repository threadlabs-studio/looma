import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Overlay/ContextMenu",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-context-menu"),
  parameters: createComponentDocsParameters("ui-context-menu"),
  render: () => `
    <div style="padding: 2rem;">
      <p style="margin-bottom: 1rem; color: var(--ui-text-secondary); font-size: 0.875rem;">
        Right-click the box below to open the context menu.
      </p>
      <div
        id="context-menu-demo-target"
        style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 300px;
          height: 150px;
          background: var(--ui-surface-subtle);
          border: 1px dashed var(--ui-border-default);
          border-radius: var(--ui-radius-3);
          color: var(--ui-text-secondary);
          font-size: 0.875rem;
          user-select: none;
        "
      >
        Right-click area
      </div>
      <ui-context-menu>
        <ui-menu-item value="edit">Edit</ui-menu-item>
        <ui-menu-item value="duplicate">Duplicate</ui-menu-item>
        <ui-menu-item value="archive">Archive</ui-menu-item>
        <ui-menu-item value="delete" disabled>Delete</ui-menu-item>
      </ui-context-menu>
    </div>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
