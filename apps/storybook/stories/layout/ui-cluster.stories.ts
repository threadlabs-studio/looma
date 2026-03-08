import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Layout/Cluster",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-cluster"),
  parameters: createComponentDocsParameters("ui-cluster"),
  render: ({ gap, align, justify }) => `
    <ui-cluster gap="${gap}" align="${align}" justify="${justify}">
      <span>Status: Active</span>
      <ui-button><button type="button">Save</button></ui-button>
      <ui-button><button type="button">Cancel</button></ui-button>
    </ui-cluster>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    gap: "s",
    align: "center",
    justify: "between"
  }
};
