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
    const boundedRows = Math.max(1, rows);
    const boundedCols = Math.max(1, cols);
    const tableWidth = 720;
    const tableHeight = 220;
    const rowHeight = tableHeight / boundedRows;
    const columnWidth = tableWidth / boundedCols;
    const rowBoundaries = Array.from({ length: boundedRows + 1 }, (_, index) => index * rowHeight);
    const columnBoundaries = Array.from({ length: boundedCols + 1 }, (_, index) => index * columnWidth);
    const activeRow = Math.min(1, boundedRows - 1);
    const activeColumn = Math.min(1, boundedCols - 1);
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
            max-rows="${boundedRows}"
            max-cols="${boundedCols}"
          ></ui-editor-insert-table-grid>
        </section>
      </div>

      <section style="display:grid;gap:8px;">
        <h3 style="margin:0;">Table Overlay</h3>
        <div style="position:relative;min-height:300px;padding:48px;overflow:auto;">
          <div style="position:relative;width:${tableWidth}px;height:${tableHeight}px;background:var(--ui-surface,#fff);background-image:linear-gradient(to right,var(--ui-border,#d1d5db) 1px,transparent 1px),linear-gradient(to bottom,var(--ui-border,#d1d5db) 1px,transparent 1px);background-size:${columnWidth}px ${rowHeight}px;border-right:1px solid var(--ui-border,#d1d5db);border-bottom:1px solid var(--ui-border,#d1d5db);">
            <ui-editor-table-overlay
              ${overlayOpen ? "open" : ""}
              rows="${boundedRows}"
              cols="${boundedCols}"
              row-boundaries="${rowBoundaries.join(",")}"
              column-boundaries="${columnBoundaries.join(",")}"
              active-cell="${activeColumn * columnWidth},${activeRow * rowHeight},${columnWidth},${rowHeight},${activeRow},${activeColumn}"
            ></ui-editor-table-overlay>
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
