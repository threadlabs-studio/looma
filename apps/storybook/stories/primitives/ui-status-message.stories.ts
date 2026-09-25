import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Display/Status Message",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-status-message"),
  parameters: createComponentDocsParameters("ui-status-message"),
  render: (args) => renderExample("ui-status-message", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-status-message") };
