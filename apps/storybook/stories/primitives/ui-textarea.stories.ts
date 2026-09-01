import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Forms/Textarea",
  tags: ["autodocs"],
  args: {
    value: "Draft summary",
    rows: 5,
    invalid: false
  },
  argTypes: createComponentArgTypes("ui-textarea"),
  parameters: createComponentDocsParameters("ui-textarea"),
  render: ({ value, rows, invalid }) => `
    <ui-textarea value="${value}" rows="${rows}" ${invalid ? "invalid" : ""} style="inline-size: 320px;">
      <textarea name="notes" placeholder="Add notes"></textarea>
    </ui-textarea>
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
