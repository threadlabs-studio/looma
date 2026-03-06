import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta = {
  title: "Primitives/ui-menu-item",
  tags: ["autodocs"],
  argTypes: {
    value: { control: "text" },
    disabled: { control: "boolean" }
  },
  render: ({ value, disabled }) => `
    <ui-menu role="menu" aria-label="Single item menu">
      <ui-menu-item value="${value}" ${disabled ? "disabled" : ""}>${value}</ui-menu-item>
    </ui-menu>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: "edit",
    disabled: false
  }
};
