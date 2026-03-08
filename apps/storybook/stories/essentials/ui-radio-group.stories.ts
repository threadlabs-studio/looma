import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Forms/Radio Group",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-radio-group"),
  parameters: createComponentDocsParameters("ui-radio-group"),
  render: ({ value, orientation, name, disabled, required }) => `
    <ui-radio-group
      value="${value}"
      orientation="${orientation}"
      name="${name}"
      ${disabled ? "disabled" : ""}
      ${required ? "required" : ""}
    >
      <ui-radio value="starter">Starter</ui-radio>
      <ui-radio value="pro">Pro</ui-radio>
      <ui-radio value="enterprise">Enterprise</ui-radio>
    </ui-radio-group>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: "starter",
    orientation: "horizontal",
    name: "plan",
    disabled: false,
    required: false
  }
};
