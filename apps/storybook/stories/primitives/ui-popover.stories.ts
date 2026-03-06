import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta = {
  title: "Primitives/ui-popover",
  tags: ["autodocs"],
  argTypes: {
    open: { control: "boolean" }
  },
  render: ({ open }) => `
    <ui-popover ${open ? "open" : ""}>
      This is popover content.
    </ui-popover>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true
  }
};
