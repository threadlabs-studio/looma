import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Display/Page Header",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-page-header"),
  parameters: createComponentDocsParameters("ui-page-header"),
  render: (args) => renderExample("ui-page-header", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-page-header") };
