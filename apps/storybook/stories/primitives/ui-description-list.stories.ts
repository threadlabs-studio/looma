import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Display/Description List",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-description-list"),
  parameters: createComponentDocsParameters("ui-description-list"),
  render: (args) => renderExample("ui-description-list", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-description-list") };
