import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Display/Avatar",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-avatar"),
  parameters: createComponentDocsParameters("ui-avatar"),
  render: ({ src, alt, name, fallback }) => `
    <ui-avatar src="${src}" alt="${alt}" name="${name}" fallback="${fallback}"></ui-avatar>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    src: "",
    alt: "Alex Morgan",
    name: "Alex Morgan",
    fallback: "AM"
  }
};

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%236b7280'/%3E%3Ctext x='32' y='38' text-anchor='middle' fill='white' font-size='24' font-family='sans-serif'%3EAM%3C/text%3E%3C/svg%3E";

export const WithImage: Story = {
  args: {
    src: PLACEHOLDER_IMAGE,
    alt: "Alex Morgan",
    name: "Alex Morgan",
    fallback: "AM"
  }
};
