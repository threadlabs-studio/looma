import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";

const meta = {
  title: "Display/Chip",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-chip"),
  parameters: createComponentDocsParameters("ui-chip"),
  render: ({ appearance }) => `<ui-chip appearance="${appearance}">Research</ui-chip>`,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Tag: Story = { args: { appearance: "tag" } };
export const Pill: Story = { args: { appearance: "pill" } };
export const SemanticColor: Story = {
  render: () => `<ui-chip appearance="tag" style="--ui-chip-surface: #e8f0fb; --ui-chip-text: #064f9c; --ui-chip-border: #8db8ed">Research</ui-chip>`,
};
