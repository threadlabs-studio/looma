import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Display/Spinner",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-spinner"),
  parameters: createComponentDocsParameters("ui-spinner"),
  render: (args) => renderExample("ui-spinner", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-spinner") };
