import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Navigation/Floating Action Button",
  tags: ["autodocs"],
  args: {
    label: "Create new page",
    mobileOnly: false,
    disabled: false
  },
  argTypes: createComponentArgTypes("ui-floating-action-button"),
  parameters: createComponentDocsParameters("ui-floating-action-button"),
  render: ({ label, mobileOnly, disabled }) => `
    <div style="position: relative; min-height: 180px; background: #f8fafc; border-radius: 16px; overflow: hidden;">
      <ui-floating-action-button
        label="${label}"
        ${mobileOnly ? "mobile-only" : ""}
        ${disabled ? "disabled" : ""}
        style="position: absolute; --ui-floating-action-button-z-index: 1;"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-linecap="round" />
        </svg>
      </ui-floating-action-button>
    </div>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
