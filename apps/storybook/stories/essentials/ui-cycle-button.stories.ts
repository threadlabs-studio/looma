import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Forms/Cycle Button",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-cycle-button"),
  parameters: createComponentDocsParameters("ui-cycle-button"),
  render: (args) => renderExample("ui-cycle-button", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-cycle-button") };
