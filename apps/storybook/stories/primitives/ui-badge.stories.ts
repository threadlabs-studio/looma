import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Display/Badge",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-badge"),
  parameters: createComponentDocsParameters("ui-badge"),
  render: (args) => renderExample("ui-badge", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-badge") };
