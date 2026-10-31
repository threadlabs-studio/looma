import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Forms/DateField",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-date-field"),
  parameters: createComponentDocsParameters("ui-date-field"),
  render: (args) => renderExample("ui-date-field", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-date-field") };
