import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Navigation/Top Bar",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-top-bar"),
  parameters: createComponentDocsParameters("ui-top-bar"),
  render: (args) => renderExample("ui-top-bar", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-top-bar") };
