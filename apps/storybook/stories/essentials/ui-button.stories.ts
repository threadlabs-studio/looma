import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Essentials/ui-button",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-button"),
  parameters: createComponentDocsParameters("ui-button"),
  render: ({ variant, size, disabled }) => `
    <ui-button variant="${variant}" size="${size}" ${disabled ? "disabled" : ""}>
      <button type="button">Action</button>
    </ui-button>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: "solid",
    size: "sm",
    disabled: false
  }
};
