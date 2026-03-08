import type { Meta, StoryObj } from "@storybook/web-components-vite";

const editIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const copyIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const archiveIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>`;
const trashIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`;

const meta = {
  title: "Overlay/Menu Showcase",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Example menu with icon-prefixed items and a destructive action."
      }
    }
  },
  render: () => `
    <ui-menu role="menu" aria-label="Document actions" open>
      <ui-menu-item value="edit">
        <span style="display: inline-flex; align-items: center; gap: var(--ui-space-2);">
          <span style="display: flex; color: var(--ui-text-secondary);">${editIcon}</span>
          Edit
        </span>
      </ui-menu-item>
      <ui-menu-item value="duplicate">
        <span style="display: inline-flex; align-items: center; gap: var(--ui-space-2);">
          <span style="display: flex; color: var(--ui-text-secondary);">${copyIcon}</span>
          Duplicate
        </span>
      </ui-menu-item>
      <ui-menu-item value="archive">
        <span style="display: inline-flex; align-items: center; gap: var(--ui-space-2);">
          <span style="display: flex; color: var(--ui-text-secondary);">${archiveIcon}</span>
          Archive
        </span>
      </ui-menu-item>
      <ui-menu-item value="delete">
        <span style="display: inline-flex; align-items: center; gap: var(--ui-space-2); color: var(--ui-danger-solid);">
          <span style="display: flex;">${trashIcon}</span>
          Delete
        </span>
      </ui-menu-item>
    </ui-menu>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithIcons: Story = {};
