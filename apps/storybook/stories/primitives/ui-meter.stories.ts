import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Display/Meter",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-meter"),
  parameters: createComponentDocsParameters("ui-meter"),
  render: (args) => renderExample("ui-meter", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-meter") };
export const Steps: Story = {
  args: { segments: 6, value: 4, max: 6, tone: "info", label: "Status", valueText: "Shipped, step 4 of 6" }
};
