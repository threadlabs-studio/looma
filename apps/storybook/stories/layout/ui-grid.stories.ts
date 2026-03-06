import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta = {
  title: "Layout/ui-grid",
  tags: ["autodocs"],
  argTypes: {
    gap: { control: "text" },
    min: { control: "text" }
  },
  render: ({ gap, min }) => `
    <ui-grid gap="${gap}" min="${min}">
      <article style="padding: 1rem; border: 1px solid var(--ui-border-default);">Card A</article>
      <article style="padding: 1rem; border: 1px solid var(--ui-border-default);">Card B</article>
      <article style="padding: 1rem; border: 1px solid var(--ui-border-default);">Card C</article>
    </ui-grid>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    gap: "m",
    min: "md"
  }
};
