import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Overlay/Search Result Row",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-search-result-row"),
  parameters: createComponentDocsParameters("ui-search-result-row"),
  render: (args) => `
    <div style="max-width: 640px; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; background: #fff;">
      <ui-search-result-row ${args.selected ? "selected" : ""} ${args.disabled ? "disabled" : ""}>
        <span slot="leading" style="font-size: 1.25rem; padding-top: 2px;">📄</span>
        <p slot="title" style="font: 600 1rem/1.2 system-ui, sans-serif; color: #111827;">Project brief</p>
        <p slot="meta" style="font: 500 0.75rem/1.2 system-ui, sans-serif; color: #6b7280;">General</p>
        <p slot="excerpt" style="font: 400 0.875rem/1.4 system-ui, sans-serif; color: #4b5563;">Shared notes and action items for the team.</p>
        <span slot="trailing" style="color: #6b7280; padding-top: 2px;">→</span>
      </ui-search-result-row>
      <ui-search-result-row>
        <span slot="leading" style="font-size: 1.25rem; padding-top: 2px;">🗂</span>
        <p slot="title" style="font: 600 1rem/1.2 system-ui, sans-serif; color: #111827;">Design docs</p>
        <p slot="meta" style="font: 500 0.75rem/1.2 system-ui, sans-serif; color: #6b7280;">Library</p>
      </ui-search-result-row>
    </div>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    selected: false,
    disabled: false
  }
};
