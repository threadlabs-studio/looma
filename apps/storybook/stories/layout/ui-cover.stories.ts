import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Layout/Cover",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-cover"),
  parameters: createComponentDocsParameters("ui-cover"),
  render: (args) => renderExample("ui-cover", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-cover") };
