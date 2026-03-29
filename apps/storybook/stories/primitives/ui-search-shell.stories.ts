import type { Meta, StoryObj } from "@storybook/web-components-vite";
import {
  createComponentArgTypes,
  createComponentDocsParameters
} from "../shared/componentApi";

const meta = {
  title: "Overlay/Search Shell",
  tags: ["autodocs"],
  argTypes: createComponentArgTypes("ui-search-shell"),
  parameters: createComponentDocsParameters("ui-search-shell"),
  render: () => `
    <ui-search-shell style="position: relative; inset: auto; display: block; min-height: 420px; --ui-search-shell-z-index: 1;">
      <div slot="backdrop" style="position:absolute;inset:0;background:rgba(15,23,42,0.18);"></div>
      <div slot="search" style="padding:16px;border-bottom:1px solid #d0d7de;background:#fff;display:flex;gap:12px;align-items:center;">
        <span aria-hidden="true">⌕</span>
        <input type="search" placeholder="Search…" style="flex:1;border:none;outline:none;font:500 16px/1.2 system-ui,sans-serif;" />
      </div>
      <div slot="body" style="padding:12px 0;background:#fff;">
        <button type="button" style="display:flex;width:100%;padding:12px 16px;background:none;border:none;text-align:left;">Result one</button>
        <button type="button" style="display:flex;width:100%;padding:12px 16px;background:none;border:none;text-align:left;">Result two</button>
      </div>
      <div slot="footer" style="padding:8px 16px;border-top:1px solid #e5e7eb;background:#fff;color:#6b7280;font:500 12px/1.2 system-ui,sans-serif;">
        Press ⌘K to toggle
      </div>
    </ui-search-shell>
  `
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
