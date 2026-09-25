import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Editor/Table Toolbar",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-editor-table-toolbar"),
  parameters: createComponentDocsParameters("ui-editor-table-toolbar"),
  render: (args) => renderExample("ui-editor-table-toolbar", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-editor-table-toolbar") };
