import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Display/Callout",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-callout"),
  parameters: createComponentDocsParameters("ui-callout"),
  render: (args) => renderExample("ui-callout", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-callout") };
