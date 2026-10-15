import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Editor/Image Toolbar",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-editor-image-toolbar"),
  parameters: createComponentDocsParameters("ui-editor-image-toolbar"),
  render: (args) => renderExample("ui-editor-image-toolbar", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-editor-image-toolbar") };
