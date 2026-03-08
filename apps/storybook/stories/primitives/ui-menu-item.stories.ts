import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Overlay/Menu Item",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-menu-item"),
  parameters: createComponentDocsParameters("ui-menu-item"),
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
