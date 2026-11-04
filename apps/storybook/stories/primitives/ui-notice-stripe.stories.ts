import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Display/Notice Stripe",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-notice-stripe"),
  parameters: createComponentDocsParameters("ui-notice-stripe"),
  render: (args) => renderExample("ui-notice-stripe", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-notice-stripe") };
