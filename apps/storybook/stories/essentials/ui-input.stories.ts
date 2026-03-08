import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Forms/Input",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-input"),
  parameters: createComponentDocsParameters("ui-input"),
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
