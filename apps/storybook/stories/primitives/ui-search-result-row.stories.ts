import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Overlay/Search Result Row",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-search-result-row"),
  parameters: createComponentDocsParameters("ui-search-result-row"),
  render: (args) => renderExample("ui-search-result-row", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-search-result-row") };
