import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Display/Avatar",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-avatar"),
  parameters: createComponentDocsParameters("ui-avatar"),
  render: (args) => renderExample("ui-avatar", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-avatar") };
