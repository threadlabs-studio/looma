import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta = {
  title: "Essentials/ui-input",
  tags: ["autodocs"],
  argTypes: {
    value: { control: "text" },
    disabled: { control: "boolean" },
    readonly: { control: "boolean" },
    invalid: { control: "boolean" }
  },
  render: ({ value, disabled, readonly, invalid }) => `
    <ui-input value="${value}" ${disabled ? "disabled" : ""} ${readonly ? "readonly" : ""} ${invalid ? "invalid" : ""}>
      <input type="text" name="field" />
    </ui-input>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: "hello",
    disabled: false,
    readonly: false,
    invalid: false
  }
};
