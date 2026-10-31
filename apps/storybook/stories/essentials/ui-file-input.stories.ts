import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Forms/FileInput",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-file-input"),
  parameters: createComponentDocsParameters("ui-file-input"),
  render: (args) => renderExample("ui-file-input", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-file-input") };
