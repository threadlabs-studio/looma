import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Display/Nav Item",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-nav-item"),
  parameters: createComponentDocsParameters("ui-nav-item"),
  render: (args) => renderExample("ui-nav-item", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-nav-item") };
