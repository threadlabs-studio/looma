import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta = {
  title: "Primitives/ui-disclosure",
  tags: ["autodocs"],
  argTypes: {
    open: { control: "boolean" },
    disabled: { control: "boolean" }
  },
  render: ({ open, disabled }) => `
    <ui-disclosure ${open ? "open" : ""} ${disabled ? "disabled" : ""}>
      <button type="button" aria-controls="disclosure-panel">Toggle details</button>
      <div id="disclosure-panel" hidden>Progressive enhancement disclosure content.</div>
    </ui-disclosure>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: false,
    disabled: false
  }
};
