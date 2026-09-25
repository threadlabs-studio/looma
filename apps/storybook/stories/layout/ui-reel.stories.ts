import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Layout/Reel",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-reel"),
  parameters: createComponentDocsParameters("ui-reel"),
  render: (args) => renderExample("ui-reel", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-reel") };
