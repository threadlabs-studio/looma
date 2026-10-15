import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Editor/Code Language",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-editor-code-language"),
  parameters: createComponentDocsParameters("ui-editor-code-language"),
  render: (args) => renderExample("ui-editor-code-language", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-editor-code-language") };
