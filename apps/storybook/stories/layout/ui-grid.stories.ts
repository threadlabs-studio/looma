import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Layout/Grid",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-grid"),
  parameters: createComponentDocsParameters("ui-grid"),
  render: (args) => renderExample("ui-grid", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-grid") };
