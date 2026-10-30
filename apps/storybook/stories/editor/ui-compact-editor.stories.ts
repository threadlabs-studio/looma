import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Editor/Compact Editor",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-compact-editor"),
  parameters: createComponentDocsParameters("ui-compact-editor"),
  render: (args) => renderExample("ui-compact-editor", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-compact-editor") };
