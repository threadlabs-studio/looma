import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Layout/Cluster",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-cluster"),
  parameters: createComponentDocsParameters("ui-cluster"),
  render: (args) => renderExample("ui-cluster", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-cluster") };
