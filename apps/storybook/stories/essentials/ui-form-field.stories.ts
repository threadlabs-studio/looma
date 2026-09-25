import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Forms/Form Field",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-form-field"),
  parameters: createComponentDocsParameters("ui-form-field"),
  render: (args) => renderExample("ui-form-field", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-form-field") };
