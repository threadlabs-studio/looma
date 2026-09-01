import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Forms/Select",
  tags: ["autodocs"],
  args: {
    value: "editor",
    invalid: false,
    disabled: false
  },
  argTypes: createComponentArgTypes("ui-select"),
  parameters: createComponentDocsParameters("ui-select"),
  render: ({ value, invalid, disabled }) => `
    <ui-select value="${value}" ${invalid ? "invalid" : ""} ${disabled ? "disabled" : ""} style="inline-size: 240px;">
      <select name="role">
        <option value="viewer">Viewer</option>
        <option value="editor">Editor</option>
        <option value="admin">Admin</option>
      </select>
    </ui-select>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Invalid: Story = {
  args: {
    invalid: true
  }
};
