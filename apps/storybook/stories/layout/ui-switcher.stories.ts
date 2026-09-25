import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Layout/Switcher",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-switcher"),
  parameters: createComponentDocsParameters("ui-switcher"),
  render: (args) => renderExample("ui-switcher", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-switcher") };
