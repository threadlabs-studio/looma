import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Forms/Icon Button",
  tags: ["autodocs"],
  args: {
    label: "Search",
    variant: "ghost",
    size: "md"
  },
  argTypes: createComponentArgTypes("ui-icon-button"),
  parameters: createComponentDocsParameters("ui-icon-button"),
  render: ({ label, variant, size }) => `
    <ui-icon-button label="${label}" variant="${variant}" size="${size}">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="7" stroke="currentColor" />
        <path d="m20 20-3.5-3.5" stroke="currentColor" stroke-linecap="round" />
      </svg>
    </ui-icon-button>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Outline: Story = {
  args: {
    label: "Settings",
    variant: "outline"
  }
};
export const Solid: Story = {
  args: {
    label: "Add page",
    variant: "solid"
  }
};
