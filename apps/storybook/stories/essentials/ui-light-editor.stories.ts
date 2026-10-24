import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Forms/LightEditor",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-light-editor"),
  parameters: createComponentDocsParameters("ui-light-editor"),
  render: (args) => renderExample("ui-light-editor", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-light-editor") };
