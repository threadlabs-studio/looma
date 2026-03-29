import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Navigation/Top Bar",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-top-bar"),
  parameters: createComponentDocsParameters("ui-top-bar"),
  render: () => `
    <ui-top-bar style="max-width: 420px; --ui-top-bar-z-index: 1;">
      <button slot="leading" type="button" aria-label="Open navigation">☰</button>
      <h1 style="margin: 0; font: 600 1rem/1.2 system-ui, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Project Atlas</h1>
      <button slot="search" type="button" aria-label="Search">⌕</button>
      <button slot="actions" type="button" aria-label="Share">Share</button>
    </ui-top-bar>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
