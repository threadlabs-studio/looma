import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Display/Tabs",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-tabs"),
  parameters: createComponentDocsParameters("ui-tabs"),
  render: (args) => renderExample("ui-tabs", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-tabs") };
