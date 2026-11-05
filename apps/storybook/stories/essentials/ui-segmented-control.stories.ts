import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Forms/Segmented Control",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-segmented-control"),
  parameters: createComponentDocsParameters("ui-segmented-control"),
  render: (args) => renderExample("ui-segmented-control", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-segmented-control") };
