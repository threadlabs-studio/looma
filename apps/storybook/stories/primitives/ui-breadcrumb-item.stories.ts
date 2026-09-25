import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Navigation/Breadcrumb Item",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-breadcrumb-item"),
  parameters: createComponentDocsParameters("ui-breadcrumb-item"),
  render: (args) => renderExample("ui-breadcrumb-item", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-breadcrumb-item") };
