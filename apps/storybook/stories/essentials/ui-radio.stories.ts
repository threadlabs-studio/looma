import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Essentials/ui-radio",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-radio"),
  parameters: createComponentDocsParameters("ui-radio"),
  render: ({ value, name, checked, disabled, required }) => `
    <ui-radio
      value="${value}"
      name="${name}"
      ${checked ? "checked" : ""}
      ${disabled ? "disabled" : ""}
      ${required ? "required" : ""}
    >
      <input type="radio" />
      ${value}
    </ui-radio>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: "starter",
    name: "plan",
    checked: false,
    disabled: false,
    required: false
  }
};
