import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Layout/Action Bar",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-action-bar"),
  parameters: createComponentDocsParameters("ui-action-bar"),
  render: (args) => renderExample("ui-action-bar", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-action-bar") };
