import type { Meta, StoryObj } from "@storybook/web-components-vite";

type PlaygroundArgs = {
  contextMenuOpen: boolean;
  insertGridOpen: boolean;
  overlayOpen: boolean;
  rows: number;
  cols: number;
};

function addLogLine(logEl: HTMLElement | null, label: string, payload: unknown): void {
  if (!logEl) return;
  const stamp = new Date().toLocaleTimeString();
  const line = `[${stamp}] ${label}: ${JSON.stringify(payload)}`;
  logEl.textContent = `${line}\n${logEl.textContent ?? ""}`.trim();
}

const meta = {
  title: "Editor/Table Primitives Playground",
  parameters: {
    docs: {
      description: {
        component:
          "Live playground for Looma editor table primitives. Interact with controls and inspect emitted custom event payloads."
      }
    }
  },
  argTypes: {
    contextMenuOpen: { control: "boolean" },
    insertGridOpen: { control: "boolean" },
    overlayOpen: { control: "boolean" },
    rows: { control: { type: "range", min: 1, max: 12, step: 1 } },
    cols: { control: { type: "range", min: 1, max: 12, step: 1 } }
  },
  render: ({ contextMenuOpen, insertGridOpen, overlayOpen, rows, cols }: PlaygroundArgs) => {
    const root = document.createElement("div");
    root.style.display = "grid";
    root.style.gap = "16px";
    root.style.maxWidth = "960px";

    root.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(2,minmax(280px,1fr));gap:16px;align-items:start;">
        <section style="display:grid;gap:8px;">
          <h3 style="margin:0;">Table Context Menu</h3>
          <ui-editor-table-context-menu
            ${contextMenuOpen ? "open" : ""}
            can-add-row-before
            can-add-row-after
            can-add-column-before
            can-add-column-after
            can-delete-row
            can-delete-column
            can-delete-table
            can-merge-cells
            can-split-cell
          ></ui-editor-table-context-menu>
        </section>

        <section style="display:grid;gap:8px;">
          <h3 style="margin:0;">Insert Table Grid</h3>
          <ui-editor-insert-table-grid
            ${insertGridOpen ? "open" : ""}
            max-rows="${Math.max(1, rows)}"
            max-cols="${Math.max(1, cols)}"
          ></ui-editor-insert-table-grid>
        </section>
      </div>

      <section style="display:grid;gap:8px;">
        <h3 style="margin:0;">Table Overlay</h3>
        <div style="position:relative;height:220px;border:1px dashed var(--ui-border,#d1d5db);border-radius:8px;padding:24px;overflow:visible;">
          <div style="position:absolute;inset:24px;">
            <ui-editor-table-overlay
              ${overlayOpen ? "open" : ""}
              rows="${Math.max(1, rows)}"
              cols="${Math.max(1, cols)}"
            ></ui-editor-table-overlay>
          </div>
          <div style="height:100%;display:flex;align-items:center;justify-content:center;color:var(--ui-text-muted,#6b7280);font-size:14px;">
            Simulated table bounds for overlay interaction
          </div>
        </div>
      </section>

      <section style="display:grid;gap:8px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <h3 style="margin:0;">Event Log</h3>
          <ui-button data-clear-log><button type="button">Clear</button></ui-button>
        </div>
        <pre data-log style="margin:0;min-height:160px;max-height:280px;overflow:auto;background:var(--ui-surface,#fff);border:1px solid var(--ui-border,#d1d5db);border-radius:8px;padding:12px;font-size:12px;"></pre>
      </section>
    `;

    const logEl = root.querySelector("[data-log]") as HTMLElement | null;
    const clearBtn = root.querySelector("[data-clear-log]") as HTMLElement | null;
    clearBtn?.addEventListener("click", () => {
      if (logEl) logEl.textContent = "";
    });

    const context = root.querySelector("ui-editor-table-context-menu");
    const grid = root.querySelector("ui-editor-insert-table-grid");
    const overlay = root.querySelector("ui-editor-table-overlay");

    context?.addEventListener("looma-editor-table-action", (event) => {
      addLogLine(logEl, "looma-editor-table-action", (event as CustomEvent).detail);
    });
    grid?.addEventListener("looma-editor-insert-table", (event) => {
      addLogLine(logEl, "looma-editor-insert-table", (event as CustomEvent).detail);
    });
    overlay?.addEventListener("looma-editor-table-overlay-action", (event) => {
      addLogLine(logEl, "looma-editor-table-overlay-action", (event as CustomEvent).detail);
    });

    addLogLine(logEl, "playground-ready", { rows, cols, contextMenuOpen, insertGridOpen, overlayOpen });
    return root;
  }
} satisfies Meta<PlaygroundArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    contextMenuOpen: true,
    insertGridOpen: true,
    overlayOpen: true,
    rows: 4,
    cols: 4
  }
};
