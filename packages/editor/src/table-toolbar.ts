/**
 * ui-editor-table-toolbar — lightweight structural actions for an active table.
 * Emits looma-editor-table-action, matching the table context menu contract.
 * Domain-neutral: no Tiptap dependency.
 */

import type {
  TableContextMenuAction,
  TableContextMenuActionEventDetail,
} from "./table-context-menu";

const TAG = "ui-editor-table-toolbar";

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
class UIEditorTableToolbarElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return [
      "open",
      "can-add-row-after",
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

  private onClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
    const action = target?.dataset.action as TableContextMenuAction | undefined;
    if (!action) {
      return;
    }

    dispatchTableAction(this, action);
  };

  private render(): void {
    const open = this.getBoolAttr("open");
    this.hidden = !open;
    if (!open) {
      return;
    }

    const actions = (
      [
        { action: "add-row-after", label: "Add row", can: "can-add-row-after" },
        { action: "add-column-after", label: "Add column", can: "can-add-column-after" },
        { action: "merge-cells", label: "Merge", can: "can-merge-cells" },
        { action: "split-cell", label: "Split", can: "can-split-cell" },
        { action: "delete-row", label: "Delete row", can: "can-delete-row" },
        { action: "delete-column", label: "Delete column", can: "can-delete-column" },
        { action: "delete-table", label: "Delete table", can: "can-delete-table", tone: "danger" },
      ] satisfies Array<{
        action: TableContextMenuAction;
        label: string;
        can: string;
        tone?: string;
      }>
    ).filter((action) => this.getBoolAttr(action.can));

    this.innerHTML = [
      '<div class="ui-editor-table-toolbar" role="toolbar" aria-label="Table actions">',
      actions
        .map(
          (action) =>
            `<button type="button" data-action="${action.action}"${action.tone ? ` data-tone="${action.tone}"` : ""}>${action.label}</button>`
        )
        .join(""),
      "</div>",
    ].join("");
  }
}

if (typeof window !== "undefined" && !customElements.get(TAG)) {
  customElements.define(TAG, UIEditorTableToolbarElement);
}
}
