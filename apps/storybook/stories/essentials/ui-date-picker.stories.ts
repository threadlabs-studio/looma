import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Forms/DatePicker",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-date-picker"),
  parameters: createComponentDocsParameters("ui-date-picker"),
  render: (args) => renderExample("ui-date-picker", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-date-picker") };
