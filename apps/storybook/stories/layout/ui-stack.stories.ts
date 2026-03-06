import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta = {
  title: "Layout/ui-stack",
  tags: ["autodocs"],
  argTypes: {
    gap: { control: "text" },
    align: { control: "text" },
    justify: { control: "text" }
  },
  render: ({ gap, align, justify }) => `
    <ui-stack gap="${gap}" align="${align}" justify="${justify}">
      <div>Header</div>
      <div>Body</div>
      <div>Footer</div>
    </ui-stack>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    gap: "m",
    align: "stretch",
    justify: "start"
  }
};
