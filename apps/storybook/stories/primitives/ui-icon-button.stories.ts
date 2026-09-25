import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Forms/Icon Button",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-icon-button"),
  parameters: createComponentDocsParameters("ui-icon-button"),
  render: (args) => renderExample("ui-icon-button", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-icon-button") };
