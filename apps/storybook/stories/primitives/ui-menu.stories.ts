import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta = {
  title: "Primitives/ui-menu",
  tags: ["autodocs"],
  render: () => `
    <ui-menu role="menu" aria-label="Actions">
      <ui-menu-item value="edit">Edit</ui-menu-item>
      <ui-menu-item value="duplicate">Duplicate</ui-menu-item>
      <ui-menu-item value="archive">Archive</ui-menu-item>
    </ui-menu>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
