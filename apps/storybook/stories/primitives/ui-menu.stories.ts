import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Overlay/Menu",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-menu"),
  parameters: createComponentDocsParameters("ui-menu"),
  render: (args) => renderExample("ui-menu", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-menu") };
