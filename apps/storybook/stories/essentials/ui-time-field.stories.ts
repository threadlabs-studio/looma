import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Forms/TimeField",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-time-field"),
  parameters: createComponentDocsParameters("ui-time-field"),
  render: (args) => renderExample("ui-time-field", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-time-field") };
