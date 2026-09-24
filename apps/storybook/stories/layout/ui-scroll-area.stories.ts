import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";

const meta = {
  title: "Layout/Scroll Area",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-scroll-area"),
  parameters: createComponentDocsParameters("ui-scroll-area"),
  render: ({ orientation }) => orientation === "horizontal"
    ? `<ui-scroll-area orientation="horizontal" role="region" aria-label="Wide content" tabindex="0">
        <p style="inline-size: 60rem">A single line far wider than the area, so the area scrolls sideways.</p>
      </ui-scroll-area>`
    : `<ui-scroll-area style="block-size: 10rem">
        ${Array.from({ length: 12 }, (_, index) => `<p>Item ${index + 1}</p>`).join("")}
      </ui-scroll-area>`
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { orientation: "vertical" } };
