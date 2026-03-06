import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta = {
  title: "Layout/ui-separator",
  tags: ["autodocs"],
  argTypes: {
    orientation: { control: "radio", options: ["horizontal", "vertical"] }
  },
  render: ({ orientation }) => `
    <div style="display: flex; align-items: center; gap: 1rem; ${orientation === "vertical" ? "height: 3rem;" : ""}">
      <span>Before</span>
      <ui-separator orientation="${orientation}"></ui-separator>
      <span>After</span>
    </div>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    orientation: "horizontal"
  }
};
