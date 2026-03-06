import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Essentials/ui-form-field",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-form-field"),
  parameters: createComponentDocsParameters("ui-form-field"),
  render: ({ required, disabled, invalid }) => `
    <ui-form-field ${required ? "required" : ""} ${disabled ? "disabled" : ""} ${invalid ? "invalid" : ""}>
      <label for="storybook-email">Email</label>
      <ui-input>
        <input id="storybook-email" name="email" type="email" />
      </ui-input>
      <small data-slot="help">Used only for account notifications.</small>
    </ui-form-field>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    required: true,
    disabled: false,
    invalid: false
  }
};
