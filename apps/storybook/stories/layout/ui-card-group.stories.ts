import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Layout/CardGroup",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-card-group"),
  parameters: createComponentDocsParameters("ui-card-group"),
  render: (args) => renderExample("ui-card-group", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-card-group") };
