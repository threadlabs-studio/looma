import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Display/Disclosure",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-disclosure"),
  parameters: createComponentDocsParameters("ui-disclosure"),
  render: (args) => renderExample("ui-disclosure", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-disclosure") };
