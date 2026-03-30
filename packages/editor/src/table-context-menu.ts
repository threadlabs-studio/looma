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

type TableContextMenuItem = {
  action: TableContextMenuAction;
  label: string;
  can: string;
  tone?: "danger";
};

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

    const sections = [
      {
        heading: "Structure",
        actions: [
          { action: "add-row-before", label: "Add row above", can: "can-add-row-before" },
          { action: "add-row-after", label: "Add row below", can: "can-add-row-after" },
          { action: "add-column-before", label: "Add column left", can: "can-add-column-before" },
          { action: "add-column-after", label: "Add column right", can: "can-add-column-after" },
        ] satisfies TableContextMenuItem[],
      },
      {
        heading: "Cells",
        actions: [
          { action: "merge-cells", label: "Merge cells", can: "can-merge-cells" },
          { action: "split-cell", label: "Split cell", can: "can-split-cell" },
        ] satisfies TableContextMenuItem[],
      },
      {
        heading: "Table",
        actions: [
          { action: "delete-row", label: "Delete row", can: "can-delete-row", tone: "danger" },
          { action: "delete-column", label: "Delete column", can: "can-delete-column", tone: "danger" },
          { action: "delete-table", label: "Delete table", can: "can-delete-table", tone: "danger" },
        ] satisfies TableContextMenuItem[],
      },
    ] satisfies Array<{
      heading: string;
      actions: TableContextMenuItem[];
    }>;

    const availableSections = sections
      .map((section) => ({
        ...section,
        actions: section.actions.filter((action) => this.getBoolAttr(action.can)),
      }))
      .filter((section) => section.actions.length > 0);

    let html = '<div class="ui-editor-table-context-menu" role="menu">';
    availableSections.forEach((section, sectionIndex) => {
      if (sectionIndex > 0) {
        html += '<div class="ui-editor-table-context-menu__sep"></div>';
      }
      html += '<div class="ui-editor-table-context-menu__section" role="none">';
      html += `<div class="ui-editor-table-context-menu__heading" role="presentation">${section.heading}</div>`;
      section.actions.forEach((action) => {
        const tone = "tone" in action ? action.tone : undefined;
        html += `<button type="button" role="menuitem" data-action="${action.action}"${tone ? ` data-tone="${tone}"` : ""}>${action.label}</button>`;
      });
      html += "</div>";
    });
    html += "</div>";

    this.innerHTML = html;
  }
}

if (typeof window !== "undefined" && !customElements.get(TAG)) {
  customElements.define(TAG, UIEditorTableContextMenuElement);
}
}
