import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";

const meta = {
  title: "Layout/Reel",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-reel"),
  parameters: createComponentDocsParameters("ui-reel"),
  render: ({ gap, itemWidth, snap }) => `
    <ui-reel gap="${gap}" item-width="${itemWidth}" snap="${snap}" aria-label="Recent pages">
      ${["One", "Two", "Three", "Four"].map((label) => `<article style="padding: 1rem; border: 1px solid var(--ui-border-default);">Page ${label}</article>`).join("")}
    </ui-reel>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { gap: "m", itemWidth: "md", snap: "start" } };
