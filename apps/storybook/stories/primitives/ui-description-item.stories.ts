import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Display/Description Item",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-description-item"),
  parameters: createComponentDocsParameters("ui-description-item"),
  render: (args) => renderExample("ui-description-item", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-description-item") };
