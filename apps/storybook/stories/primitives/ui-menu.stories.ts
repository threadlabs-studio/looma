import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Primitives/ui-menu",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-menu"),
  parameters: createComponentDocsParameters("ui-menu"),
  render: ({ open }) => `
    <ui-menu role="menu" aria-label="Actions" ${open ? "open" : ""}>
      <ui-menu-item value="edit">Edit</ui-menu-item>
      <ui-menu-item value="duplicate">Duplicate</ui-menu-item>
      <ui-menu-item value="archive">Archive</ui-menu-item>
    </ui-menu>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: false
  }
};
