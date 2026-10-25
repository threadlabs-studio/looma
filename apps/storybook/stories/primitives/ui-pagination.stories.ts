import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Navigation/Pagination",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-pagination"),
  parameters: createComponentDocsParameters("ui-pagination"),
  render: (args) => renderExample("ui-pagination", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-pagination") };
