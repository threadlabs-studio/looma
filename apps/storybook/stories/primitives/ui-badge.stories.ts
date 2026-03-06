import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Primitives/ui-badge",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-badge"),
  parameters: createComponentDocsParameters("ui-badge"),
  render: ({ variant, tone }) => `
    <ui-badge variant="${variant}" tone="${tone}">
      Beta
    </ui-badge>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: "subtle",
    tone: "accent"
  }
};
