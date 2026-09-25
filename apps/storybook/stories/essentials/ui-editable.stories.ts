import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Forms/Editable",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-editable"),
  parameters: createComponentDocsParameters("ui-editable"),
  render: (args) => renderExample("ui-editable", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-editable") };
