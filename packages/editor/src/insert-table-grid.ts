/**
 * ui-editor-insert-table-grid — web component for picking table dimensions.
 * Emits looma-editor-insert-table with { rows, cols, withHeaderRow }.
 * Domain-neutral: no Tiptap dependency.
 */

const TAG = "ui-editor-insert-table-grid";
const DEFAULT_MAX_ROWS = 8;
const DEFAULT_MAX_COLS = 8;

export interface InsertTableEventDetail {
  rows: number;
  cols: number;
  withHeaderRow: boolean;
}

if (typeof HTMLElement !== "undefined") {
class UIEditorInsertTableGridElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["open", "max-rows", "max-cols"];
  }

  #maxRows = DEFAULT_MAX_ROWS;
  #maxCols = DEFAULT_MAX_COLS;
  #selectedRows = 3;
  #selectedCols = 3;
  #previewRows: number | null = null;
  #previewCols: number | null = null;
  #withHeaderRow = true;
  #selectionPinned = false;

  connectedCallback(): void {
    this.#maxRows = Math.min(10, Math.max(1, parseInt(this.getAttribute("max-rows") ?? String(DEFAULT_MAX_ROWS), 10) || DEFAULT_MAX_ROWS));
    this.#maxCols = Math.min(10, Math.max(1, parseInt(this.getAttribute("max-cols") ?? String(DEFAULT_MAX_COLS), 10) || DEFAULT_MAX_COLS));
    this.render();
    this.addEventListener("click", this.onClick);
    this.addEventListener("mouseover", this.onMouseOver);
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this.onClick);
    this.removeEventListener("mouseover", this.onMouseOver);
  }

  attributeChangedCallback(name: string): void {
    if (name === "max-rows") this.#maxRows = Math.min(10, Math.max(1, parseInt(this.getAttribute("max-rows") ?? String(DEFAULT_MAX_ROWS), 10) || DEFAULT_MAX_ROWS));
    if (name === "max-cols") this.#maxCols = Math.min(10, Math.max(1, parseInt(this.getAttribute("max-cols") ?? String(DEFAULT_MAX_COLS), 10) || DEFAULT_MAX_COLS));
    this.render();
  }

  private onClick(e: MouseEvent): void {
    const cell = (e.target as HTMLElement).closest("[data-row][data-col]");
    if (cell) {
      this.#selectedRows = parseInt(cell.getAttribute("data-row") ?? "1", 10);
      this.#selectedCols = parseInt(cell.getAttribute("data-col") ?? "1", 10);
      this.#previewRows = null;
      this.#previewCols = null;
      this.#selectionPinned = true;
      this.updateSelectionPreview();
      return;
    }

    const target = (e.target as HTMLElement).closest("[data-insert-table]");
    if (target) {
      const checkbox = this.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
      const withHeaderRow = checkbox?.checked ?? this.#withHeaderRow;
      this.dispatchEvent(
        new CustomEvent<InsertTableEventDetail>("looma-editor-insert-table", {
          detail: { rows: this.#selectedRows, cols: this.#selectedCols, withHeaderRow },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  private onMouseOver(e: MouseEvent): void {
    if (this.#selectionPinned) {
      return;
    }

    const cell = (e.target as HTMLElement).closest("[data-row][data-col]");
    if (cell) {
      const nextRows = parseInt(cell.getAttribute("data-row") ?? "1", 10);
      const nextCols = parseInt(cell.getAttribute("data-col") ?? "1", 10);
      if (nextRows === this.#previewRows && nextCols === this.#previewCols) {
        return;
      }
      this.#previewRows = nextRows;
      this.#previewCols = nextCols;
      this.updateSelectionPreview();
    }
  }

  private updateSelectionPreview(): void {
    const activeRows = this.#previewRows ?? this.#selectedRows;
    const activeCols = this.#previewCols ?? this.#selectedCols;
    const hint = this.querySelector(".ui-editor-insert-table-grid__hint");
    if (hint) {
      hint.textContent = this.#selectionPinned
        ? `${this.#selectedRows} × ${this.#selectedCols} selected`
        : `${activeRows} × ${activeCols}`;
    }

    const cells = this.querySelectorAll<HTMLElement>("[data-row][data-col]");
    for (const cell of cells) {
      const row = parseInt(cell.getAttribute("data-row") ?? "1", 10);
      const col = parseInt(cell.getAttribute("data-col") ?? "1", 10);
      const selected = row <= activeRows && col <= activeCols;
      cell.classList.toggle("ui-editor-insert-table-grid__cell--selected", selected);
      cell.setAttribute("aria-pressed", selected ? "true" : "false");
    }
  }

  private render(): void {
    const open = this.hasAttribute("open") && this.getAttribute("open") !== "false";
    this.hidden = !open;
    if (!open) return;

    let html = '<div class="ui-editor-insert-table-grid">';
    html += `<p class="ui-editor-insert-table-grid__hint">${this.#selectedRows} × ${this.#selectedCols}</p>`;
    html += '<div class="ui-editor-insert-table-grid__grid" role="group" aria-label="Table dimensions">';
    for (let r = 1; r <= this.#maxRows; r++) {
      for (let c = 1; c <= this.#maxCols; c++) {
        const selected = r <= this.#selectedRows && c <= this.#selectedCols;
        html += `<button type="button" data-row="${r}" data-col="${c}" aria-label="${r} rows by ${c} columns" aria-pressed="${selected ? "true" : "false"}" class="ui-editor-insert-table-grid__cell${selected ? " ui-editor-insert-table-grid__cell--selected" : ""}"></button>`;
      }
    }
    html += "</div>";
    html += '<label class="ui-editor-insert-table-grid__header"><input type="checkbox" checked /> Header row</label>';
    html += '<button type="button" data-insert-table>Insert table</button>';
    html += "</div>";

    this.innerHTML = html;

    const checkbox = this.querySelector('input[type="checkbox"]') as HTMLInputElement;
    if (checkbox) {
      checkbox.checked = this.#withHeaderRow;
      checkbox.addEventListener("change", () => {
        this.#withHeaderRow = checkbox.checked;
      });
    }

    this.updateSelectionPreview();
  }
}

if (typeof window !== "undefined" && !customElements.get(TAG)) {
  customElements.define(TAG, UIEditorInsertTableGridElement);
}
}
