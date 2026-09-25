import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Overlay/Search Shell",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-search-shell"),
  parameters: createComponentDocsParameters("ui-search-shell"),
  render: (args) => renderExample("ui-search-shell", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-search-shell") };
