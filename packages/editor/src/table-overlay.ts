/**
 * ui-editor-table-overlay — table edge controls for row/column insertion.
 * Emits looma-editor-table-overlay-action with insertion intent.
 * Domain-neutral: no Tiptap dependency.
 */

const TAG = "ui-editor-table-overlay";
const DEFAULT_ROWS = 3;
const DEFAULT_COLS = 3;

export type TableOverlayAction = "add-row-before" | "add-row-after" | "add-column-before" | "add-column-after";

export interface TableOverlayActionEventDetail {
  action: TableOverlayAction;
  boundaryIndex: number;
}

if (typeof HTMLElement !== "undefined") {
class UIEditorTableOverlayElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["open", "rows", "cols"];
  }

  #rows = DEFAULT_ROWS;
  #cols = DEFAULT_COLS;

  connectedCallback(): void {
    this.#rows = this.#readBoundedNumber("rows", DEFAULT_ROWS);
    this.#cols = this.#readBoundedNumber("cols", DEFAULT_COLS);
    this.render();
    this.addEventListener("click", this.onClick);
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this.onClick);
  }

  attributeChangedCallback(name: string): void {
    if (name === "rows") this.#rows = this.#readBoundedNumber("rows", DEFAULT_ROWS);
    if (name === "cols") this.#cols = this.#readBoundedNumber("cols", DEFAULT_COLS);
    this.render();
  }

  #readBoundedNumber(name: string, fallback: number): number {
    const parsed = parseInt(this.getAttribute(name) ?? String(fallback), 10);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.min(100, Math.max(1, parsed));
  }

  private onClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
    if (!target) {
      return;
    }

    const action = target.getAttribute("data-action") as TableOverlayAction | null;
    const boundaryIndex = parseInt(target.getAttribute("data-boundary-index") ?? "-1", 10);
    if (!action || !Number.isFinite(boundaryIndex) || boundaryIndex < 0) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent<TableOverlayActionEventDetail>("looma-editor-table-overlay-action", {
        detail: { action, boundaryIndex },
        bubbles: true,
        composed: true,
      })
    );
  };

  private render(): void {
    const open = this.hasAttribute("open") && this.getAttribute("open") !== "false";
    this.hidden = !open;
    if (!open) return;

    let html = '<div class="ui-editor-table-overlay" aria-hidden="true">';
    html += `<div class="ui-editor-table-overlay__rows" style="--ui-editor-table-overlay-row-boundaries:${this.#rows + 1};">`;
    for (let i = 0; i <= this.#rows; i++) {
      const action = i === 0 ? "add-row-before" : "add-row-after";
      html += `<button type="button" class="ui-editor-table-overlay__control ui-editor-table-overlay__control--row" data-action="${action}" data-boundary-index="${i}" aria-label="Add row"></button>`;
    }
    html += "</div>";

    html += `<div class="ui-editor-table-overlay__cols" style="--ui-editor-table-overlay-col-boundaries:${this.#cols + 1};">`;
    for (let i = 0; i <= this.#cols; i++) {
      const action = i === 0 ? "add-column-before" : "add-column-after";
      html += `<button type="button" class="ui-editor-table-overlay__control ui-editor-table-overlay__control--col" data-action="${action}" data-boundary-index="${i}" aria-label="Add column"></button>`;
    }
    html += "</div>";
    html += "</div>";

    this.innerHTML = html;
  }
}

if (typeof window !== "undefined" && !customElements.get(TAG)) {
  customElements.define(TAG, UIEditorTableOverlayElement);
}
}
