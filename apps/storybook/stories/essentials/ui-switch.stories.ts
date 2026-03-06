import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Essentials/ui-switch",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-switch"),
  parameters: createComponentDocsParameters("ui-switch"),
  render: ({ checked, disabled, required, value }) => `
    <ui-switch
      ${checked ? "checked" : ""}
      ${disabled ? "disabled" : ""}
      ${required ? "required" : ""}
      value="${value}"
    >
      <input type="checkbox" />
      Enable notifications
    </ui-switch>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    checked: false,
    disabled: false,
    required: false,
    value: "notifications"
  }
};
