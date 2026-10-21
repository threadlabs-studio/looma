import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Editor/Footnote Editor",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-editor-footnote-editor"),
  parameters: createComponentDocsParameters("ui-editor-footnote-editor"),
  render: (args) => renderExample("ui-editor-footnote-editor", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-editor-footnote-editor") };
