import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Forms/ColorPicker",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-color-picker"),
  parameters: createComponentDocsParameters("ui-color-picker"),
  render: (args) => renderExample("ui-color-picker", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-color-picker") };
