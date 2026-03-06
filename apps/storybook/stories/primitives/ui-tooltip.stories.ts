import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Primitives/ui-tooltip",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-tooltip"),
  parameters: createComponentDocsParameters("ui-tooltip"),
  render: ({ open }) => `
    <button id="tooltip-story-trigger" type="button">Hover or focus me</button>
    <ui-tooltip for="tooltip-story-trigger" ${open ? "open" : ""}>Contextual helper text.</ui-tooltip>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: false
  }
};
