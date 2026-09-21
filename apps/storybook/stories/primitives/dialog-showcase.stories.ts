import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta = {
  title: "Overlay/Dialog Showcase",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Example dialog with title, body, and action buttons including danger intent."
      }
    }
  },
  render: () => `
    <ui-dialog open modal>
      <h2 style="margin: 0 0 var(--ui-space-2); font-size: var(--ui-font-size-lg); font-weight: 600;">Delete document?</h2>
      <p style="margin: 0 0 var(--ui-space-4); color: var(--ui-text-secondary);">
        This action cannot be undone. The document will be permanently removed.
      </p>
      <div style="display: flex; gap: var(--ui-space-2); justify-content: flex-end;">
        <ui-button variant="ghost">Cancel</ui-button>
        <ui-button variant="danger">Delete</ui-button>
      </div>
    </ui-dialog>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithActions: Story = {};
