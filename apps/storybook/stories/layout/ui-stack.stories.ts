import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Layout/Stack",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-stack"),
  parameters: createComponentDocsParameters("ui-stack"),
  render: ({ gap, align, justify }) => `
    <ui-stack gap="${gap}" align="${align}" justify="${justify}">
      <div>Header</div>
      <div>Body</div>
      <div>Footer</div>
    </ui-stack>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    gap: "m",
    align: "stretch",
    justify: "start"
  }
};
