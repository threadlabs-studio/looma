import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Layout/Container",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-container"),
  parameters: createComponentDocsParameters("ui-container"),
  render: (args) => renderExample("ui-container", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-container") };
