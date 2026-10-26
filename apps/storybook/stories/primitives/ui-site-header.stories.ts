import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Navigation/Site Header",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-site-header"),
  parameters: createComponentDocsParameters("ui-site-header"),
  render: (args) => renderExample("ui-site-header", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-site-header") };
