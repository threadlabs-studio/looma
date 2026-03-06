import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta = {
  title: "Primitives/ui-dialog",
  tags: ["autodocs"],
  argTypes: {
    open: { control: "boolean" },
    modal: { control: "boolean" }
  },
  render: ({ open, modal }) => `
    <ui-dialog ${open ? "open" : ""} ${modal ? "" : 'modal="false"'}>
      <dialog>
        <h3>Dialog title</h3>
        <p>Overlay contract example.</p>
        <button type="button">Close</button>
      </dialog>
    </ui-dialog>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true,
    modal: true
  }
};
