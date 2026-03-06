import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta = {
  title: "Essentials/ui-form-field",
  tags: ["autodocs"],
  argTypes: {
    required: { control: "boolean" },
    disabled: { control: "boolean" },
    invalid: { control: "boolean" }
  },
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
