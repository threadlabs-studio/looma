import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Forms/Checkbox",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-checkbox"),
  parameters: createComponentDocsParameters("ui-checkbox"),
  render: ({ checked, disabled, required, indeterminate, value }) => `
    <ui-checkbox
      ${checked ? "checked" : ""}
      ${disabled ? "disabled" : ""}
      ${required ? "required" : ""}
      ${indeterminate ? "indeterminate" : ""}
      value="${value}"
    >
      <label>
        <input type="checkbox" />
        <span>Receive updates</span>
      </label>
    </ui-checkbox>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    checked: false,
    disabled: false,
    required: false,
    indeterminate: false,
    value: "newsletter"
  }
};
