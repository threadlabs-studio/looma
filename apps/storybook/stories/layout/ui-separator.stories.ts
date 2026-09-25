import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Layout/Separator",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-separator"),
  parameters: createComponentDocsParameters("ui-separator"),
  render: (args) => renderExample("ui-separator", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-separator") };
