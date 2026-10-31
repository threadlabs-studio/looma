import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Forms/DateRangePicker",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-date-range-picker"),
  parameters: createComponentDocsParameters("ui-date-range-picker"),
  render: (args) => renderExample("ui-date-range-picker", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-date-range-picker") };
