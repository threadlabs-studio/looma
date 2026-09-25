import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Forms/Textarea",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-textarea"),
  parameters: createComponentDocsParameters("ui-textarea"),
  render: (args) => renderExample("ui-textarea", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-textarea") };
