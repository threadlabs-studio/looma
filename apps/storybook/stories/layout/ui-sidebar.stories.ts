import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { createComponentArgTypes, createComponentDocsParameters } from "../shared/componentApi";

// The sidebar is the panel only; each story lays it out beside main content, as an application does.
const meta = {
  title: "Layout/Sidebar",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-sidebar"),
  parameters: createComponentDocsParameters("ui-sidebar"),
  render: ({ side, width, collapsed }) => `
    <div style="display: flex; height: 20rem; border: 1px solid var(--ui-border-default);">
      ${side === "end" ? `<main style="flex: 1; padding: 1rem;">Main content</main>` : ""}
      <ui-sidebar id="story-nav" side="${side}" width="${width}" ${collapsed ? "collapsed" : ""} aria-label="Navigation">
        <nav style="padding: 1rem;">Navigation</nav>
      </ui-sidebar>
      ${side === "end" ? "" : `<main style="flex: 1; padding: 1rem;"><button commandfor="story-nav" command="--toggle">Toggle sidebar</button></main>`}
    </div>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { side: "start", width: 280, collapsed: false } };

export const Resizable: Story = {
  render: () => `
    <div style="display: flex; height: 24rem; border: 1px solid var(--ui-border-default);">
      <ui-sidebar resizable min-width="160" max-width="420" aria-label="Navigation">
        <nav style="padding: 1rem;">Drag the inner edge, or focus it and use the arrow keys.</nav>
      </ui-sidebar>
      <main style="flex: 1; padding: 1rem;">The application can save widths reported by the resize event.</main>
    </div>
  `,
};
