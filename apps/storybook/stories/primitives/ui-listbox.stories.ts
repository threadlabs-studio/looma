import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Forms/Listbox",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-listbox"),
  parameters: createComponentDocsParameters("ui-listbox"),
  render: (args) => renderExample("ui-listbox", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-listbox") };
