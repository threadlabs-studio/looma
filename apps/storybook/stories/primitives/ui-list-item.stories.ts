import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Display/List Item",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-list-item"),
  parameters: createComponentDocsParameters("ui-list-item"),
  render: (args) => renderExample("ui-list-item", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-list-item") };
