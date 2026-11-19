import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Display/Data Table",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-data-table"),
  parameters: createComponentDocsParameters("ui-data-table"),
  render: (args) => renderExample("ui-data-table", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-data-table") };
