/**
 * ui-editor-table-context-menu — web component for table cell context menu.
 * Emits custom events for each action; the adapter (Vue/React) wires Tiptap commands.
 * Domain-neutral: no Tiptap dependency.
 */

const TAG = "ui-editor-table-context-menu";

export type TableContextMenuAction =
  | "align-left"
  | "align-center"
  | "align-right"
  | "add-row-before"
  | "add-row-after"
  | "add-column-before"
  | "add-column-after"
  | "delete-row"
  | "delete-column"
  | "delete-table"
  | "merge-cells"
  | "split-cell";

export interface TableContextMenuActionEventDetail {
  action: TableContextMenuAction;
}

function dispatchTableAction(element: HTMLElement, action: TableContextMenuAction): void {
  element.dispatchEvent(
    new CustomEvent<TableContextMenuActionEventDetail>("looma-editor-table-action", {
      detail: { action },
      bubbles: true,
      composed: true,
    })
  );
}

if (typeof HTMLElement !== "undefined") {
class UIEditorTableContextMenuElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return [
      "open",
      "can-add-row-before",
      "can-add-row-after",
      "can-add-column-before",
      "can-add-column-after",
      "can-delete-row",
      "can-delete-column",
      "can-delete-table",
      "can-merge-cells",
      "can-split-cell",
    ];
  }

  private getBoolAttr(name: string): boolean {
    return this.hasAttribute(name) && this.getAttribute(name) !== "false";
  }

  connectedCallback(): void {
    this.render();
    this.addEventListener("click", this.onClick);
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this.onClick);
  }

  attributeChangedCallback(): void {
    this.render();
  }

  private onClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const action = target.getAttribute("data-action") as TableContextMenuAction | null;
    if (action) {
      dispatchTableAction(this, action);
    }
  }

  private render(): void {
    const open = this.getBoolAttr("open");
    this.hidden = !open;
    if (!open) return;

    const actions: { action: TableContextMenuAction; label: string; can: string }[] = [
      { action: "add-row-before", label: "Add row above", can: "can-add-row-before" },
      { action: "add-row-after", label: "Add row below", can: "can-add-row-after" },
      { action: "add-column-before", label: "Add column left", can: "can-add-column-before" },
      { action: "add-column-after", label: "Add column right", can: "can-add-column-after" },
      { action: "delete-row", label: "Delete row", can: "can-delete-row" },
      { action: "delete-column", label: "Delete column", can: "can-delete-column" },
      { action: "delete-table", label: "Delete table", can: "can-delete-table" },
      { action: "merge-cells", label: "Merge cells", can: "can-merge-cells" },
      { action: "split-cell", label: "Split cell", can: "can-split-cell" },
    ];

    const sep1 = 4;
    const sep2 = 7;

    let html = '<div class="ui-editor-table-context-menu" role="menu">';
    actions.forEach((item, i) => {
      if (i === sep1 || i === sep2) html += '<div class="ui-editor-table-context-menu__sep"></div>';
      const disabled = !this.getBoolAttr(item.can);
      html += `<button type="button" role="menuitem" data-action="${item.action}" ${disabled ? "disabled" : ""}>${item.label}</button>`;
    });
    html += "</div>";

    this.innerHTML = html;
  }
}

if (typeof window !== "undefined" && !customElements.get(TAG)) {
  customElements.define(TAG, UIEditorTableContextMenuElement);
}
}
