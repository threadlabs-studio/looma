import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";

const meta = {
  title: "Layout/Sidebar",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-sidebar"),
  parameters: createComponentDocsParameters("ui-sidebar"),
  render: ({ gap, side, width }) => `
    <div style="resize: horizontal; overflow: auto; max-width: 100%; padding: .25rem;">
      <ui-sidebar gap="${gap}" side="${side}" width="${width}">
        <aside style="padding: 1rem; border: 1px solid var(--ui-border-default);">Filters</aside>
        <main style="padding: 1rem; border: 1px solid var(--ui-border-default);">Results remain readable.</main>
      </ui-sidebar>
    </div>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { gap: "m", side: "start", width: "narrow" } };
