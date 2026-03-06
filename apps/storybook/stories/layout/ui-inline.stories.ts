import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Layout/ui-inline",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-inline"),
  parameters: createComponentDocsParameters("ui-inline"),
  render: ({ gap, align, justify, wrap }) => `
    <ui-inline gap="${gap}" align="${align}" justify="${justify}" wrap="${wrap}">
      <button type="button">Edit</button>
      <button type="button">Share</button>
      <button type="button">Archive</button>
    </ui-inline>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    gap: "s",
    align: "center",
    justify: "start",
    wrap: "wrap"
  }
};
