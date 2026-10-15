import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Editor/Chip Editor",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-editor-chip-editor"),
  parameters: createComponentDocsParameters("ui-editor-chip-editor"),
  render: (args) => renderExample("ui-editor-chip-editor", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-editor-chip-editor") };
