import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Display/Tree Item",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-tree-item"),
  parameters: createComponentDocsParameters("ui-tree-item"),
  render: (args) => renderExample("ui-tree-item", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-tree-item") };
