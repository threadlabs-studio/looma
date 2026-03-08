import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Display/Badge",
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

export const Variants: Story = {
  render: () => `
    <div style="display: flex; flex-wrap: wrap; gap: var(--ui-space-2); align-items: center;">
      <ui-badge tone="accent">Accent</ui-badge>
      <ui-badge tone="danger">Danger</ui-badge>
      <ui-badge tone="success">Success</ui-badge>
      <ui-badge tone="warning">Warning</ui-badge>
      <ui-badge tone="info">Info</ui-badge>
      <ui-badge variant="subtle" tone="accent">Subtle accent</ui-badge>
      <ui-badge variant="subtle" tone="danger">Subtle danger</ui-badge>
    </div>
  `
};
