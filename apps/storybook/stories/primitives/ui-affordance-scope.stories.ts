import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Primitives/Affordance Scope",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-affordance-scope"),
  parameters: createComponentDocsParameters("ui-affordance-scope"),
  render: (args) => renderExample("ui-affordance-scope", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-affordance-scope") };
