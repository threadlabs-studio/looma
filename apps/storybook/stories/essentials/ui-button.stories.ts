import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Forms/Button",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-button"),
  parameters: createComponentDocsParameters("ui-button"),
  render: (args) => renderExample("ui-button", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-button") };
