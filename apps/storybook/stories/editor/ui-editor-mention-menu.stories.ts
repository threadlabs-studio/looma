import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Editor/Mention Menu",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-editor-mention-menu"),
  parameters: createComponentDocsParameters("ui-editor-mention-menu"),
  render: (args) => renderExample("ui-editor-mention-menu", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-editor-mention-menu") };
