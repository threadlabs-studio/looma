import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Forms/Calendar",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-calendar"),
  parameters: createComponentDocsParameters("ui-calendar"),
  render: (args) => renderExample("ui-calendar", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-calendar") };
