import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Editor/Block Actions",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-editor-block-actions"),
  parameters: createComponentDocsParameters("ui-editor-block-actions"),
  render: (args) => renderExample("ui-editor-block-actions", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-editor-block-actions") };
