import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Display/Text",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-text"),
  parameters: createComponentDocsParameters("ui-text"),
  render: (args) => renderExample("ui-text", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-text") };
