import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";
import { renderAllExamples, renderExample } from "../shared/examples";

const meta = {
  title: "Navigation/Breadcrumbs",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-breadcrumbs"),
  parameters: createComponentDocsParameters("ui-breadcrumbs"),
  render: (args) => renderExample("ui-breadcrumbs", args)
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Examples: Story = { render: () => renderAllExamples("ui-breadcrumbs") };
