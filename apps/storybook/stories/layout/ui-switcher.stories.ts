import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";

const meta = {
  title: "Layout/Switcher",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-switcher"),
  parameters: createComponentDocsParameters("ui-switcher"),
  render: ({ gap, threshold }) => `
    <div style="resize: horizontal; overflow: auto; max-width: 100%; width: 32rem; padding: .25rem;">
      <ui-switcher gap="${gap}" threshold="${threshold}">
        <article style="padding: 1rem; border: 1px solid var(--ui-border-default);">Panel A</article>
        <article style="padding: 1rem; border: 1px solid var(--ui-border-default);">Panel B</article>
      </ui-switcher>
    </div>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { gap: "m", threshold: "sm" } };
