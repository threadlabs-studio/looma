import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Forms/TimePicker",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-time-picker"),
  parameters: createComponentDocsParameters("ui-time-picker"),
  render: (args) => renderExample("ui-time-picker", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-time-picker") };
