import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Layout/Stack",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-stack"),
  parameters: createComponentDocsParameters("ui-stack"),
  render: (args) => renderExample("ui-stack", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-stack") };
