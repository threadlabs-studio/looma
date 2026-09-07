import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";

const meta = {
  title: "Display/Callout",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-callout"),
  parameters: createComponentDocsParameters("ui-callout"),
  render: ({ tone }) => `<ui-callout tone="${tone}">This message uses Looma's compact, semantic callout recipe.</ui-callout>`,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = { args: { tone: "info" } };
export const Tones: Story = {
  render: () => `<div style="display:grid;gap:var(--ui-space-2);max-width:36rem">
    <ui-callout tone="info">Info keeps context close at hand.</ui-callout>
    <ui-callout tone="note">Notes add durable context.</ui-callout>
    <ui-callout tone="warning">Warnings ask for care before proceeding.</ui-callout>
    <ui-callout tone="success">Success confirms a completed step.</ui-callout>
    <ui-callout tone="error">Errors explain what needs attention.</ui-callout>
  </div>`,
};
