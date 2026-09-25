import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Display/Tree",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-tree"),
  parameters: createComponentDocsParameters("ui-tree"),
  render: (args) => renderExample("ui-tree", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-tree") };
