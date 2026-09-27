import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Editor/Slash Menu Item",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-editor-slash-menu-item"),
  parameters: createComponentDocsParameters("ui-editor-slash-menu-item"),
  render: (args) => renderExample("ui-editor-slash-menu-item", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-editor-slash-menu-item") };
