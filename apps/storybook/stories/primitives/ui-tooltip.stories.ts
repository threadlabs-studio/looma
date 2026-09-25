import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Overlay/Tooltip",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-tooltip"),
  parameters: createComponentDocsParameters("ui-tooltip"),
  render: (args) => renderExample("ui-tooltip", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-tooltip") };
