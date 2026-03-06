import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Primitives/ui-avatar",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-avatar"),
  parameters: createComponentDocsParameters("ui-avatar"),
  render: ({ src, alt, name, fallback }) => `
    <ui-avatar src="${src}" alt="${alt}" name="${name}" fallback="${fallback}">
      <img />
      <span data-ui-avatar-fallback></span>
    </ui-avatar>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    src: "",
    alt: "Alex Morgan",
    name: "Alex Morgan",
    fallback: ""
  }
};
