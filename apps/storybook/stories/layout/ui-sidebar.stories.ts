import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Layout/Sidebar",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-sidebar"),
  parameters: createComponentDocsParameters("ui-sidebar"),
  render: (args) => renderExample("ui-sidebar", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-sidebar") };
