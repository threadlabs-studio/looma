import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta = {
  title: "Layout/ui-inline",
  tags: ["autodocs"],
  argTypes: {
    gap: { control: "text" },
    align: { control: "text" },
    justify: { control: "text" },
    wrap: { control: "text" }
  },
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
