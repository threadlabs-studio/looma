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
  render: ({ gap, align }) => `
    <ui-cluster gap="${gap}" align="${align}">
      <ui-badge>Design</ui-badge>
      <ui-badge>Accessibility</ui-badge>
      <ui-badge>Performance</ui-badge>
      <ui-badge>Docs</ui-badge>
    </ui-cluster>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    gap: "s",
    align: "center"
  }
};
