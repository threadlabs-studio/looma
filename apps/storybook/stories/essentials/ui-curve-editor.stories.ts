import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Forms/CurveEditor",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-curve-editor"),
  parameters: createComponentDocsParameters("ui-curve-editor"),
  render: (args) => renderExample("ui-curve-editor", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-curve-editor") };
