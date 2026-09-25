import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Editor/Insert Table Grid",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-editor-insert-table-grid"),
  parameters: createComponentDocsParameters("ui-editor-insert-table-grid"),
  render: (args) => renderExample("ui-editor-insert-table-grid", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-editor-insert-table-grid") };
