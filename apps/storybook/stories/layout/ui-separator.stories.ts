import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Layout/Separator",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-separator"),
  parameters: createComponentDocsParameters("ui-separator"),
  render: ({ orientation }) => `
    <div style="display: flex; align-items: center; gap: 1rem; ${orientation === "vertical" ? "height: 3rem;" : ""}">
      <span>Before</span>
      <ui-separator orientation="${orientation}"></ui-separator>
      <span>After</span>
    </div>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    orientation: "horizontal"
  }
};
