import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Overlay/Popover",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-popover"),
  parameters: createComponentDocsParameters("ui-popover"),
  render: (args) => renderExample("ui-popover", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-popover") };
