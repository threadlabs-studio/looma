import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Forms/Radio",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-radio"),
  parameters: createComponentDocsParameters("ui-radio"),
  render: (args) => renderExample("ui-radio", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-radio") };
