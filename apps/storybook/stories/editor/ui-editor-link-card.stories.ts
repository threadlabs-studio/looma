import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Editor/Link Card",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-editor-link-card"),
  parameters: createComponentDocsParameters("ui-editor-link-card"),
  render: (args) => renderExample("ui-editor-link-card", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-editor-link-card") };
