import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta = {
  title: "Layout/ui-cluster",
  tags: ["autodocs"],
  argTypes: {
    gap: { control: "text" },
    align: { control: "text" },
    justify: { control: "text" }
  },
  render: ({ gap, align, justify }) => `
    <ui-cluster gap="${gap}" align="${align}" justify="${justify}">
      <span>Status: Active</span>
      <button type="button">Save</button>
      <button type="button">Cancel</button>
    </ui-cluster>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    gap: "s",
    align: "center",
    justify: "between"
  }
};
