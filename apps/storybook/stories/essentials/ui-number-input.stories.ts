import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Forms/NumberInput",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-number-input"),
  parameters: createComponentDocsParameters("ui-number-input"),
  render: (args) => renderExample("ui-number-input", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-number-input") };
