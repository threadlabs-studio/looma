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
  | "background-none"
  | "background-gray"
  | "background-yellow"
  | "background-blue"
  | "background-green"
  | "background-red"
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

type TableContextMenuBackgroundItem = {
  action: TableContextMenuAction;
  label: string;
  value: string | null;
  swatch: string | null;
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
      "cell-background",
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
    const target = e.target as HTMLElement | null;
    const trigger = target?.closest<HTMLElement>("[data-action]");
    const action = trigger?.getAttribute("data-action") as TableContextMenuAction | null;
    if (action) {
      dispatchTableAction(this, action);
    }
  }

  private render(): void {
    const open = this.getBoolAttr("open");
    this.hidden = !open;
    if (!open) return;

    const currentBackground = this.getAttribute("cell-background");

    const backgroundActions = [
      { action: "background-none", label: "Default", value: null, swatch: null },
      { action: "background-gray", label: "Gray", value: "#f3f4f6", swatch: "#f3f4f6" },
      { action: "background-yellow", label: "Yellow", value: "#fef3c7", swatch: "#fef3c7" },
      { action: "background-blue", label: "Blue", value: "#dbeafe", swatch: "#dbeafe" },
      { action: "background-green", label: "Green", value: "#dcfce7", swatch: "#dcfce7" },
      { action: "background-red", label: "Red", value: "#fee2e2", swatch: "#fee2e2" },
    ] satisfies TableContextMenuBackgroundItem[];

    const sections = [
      {
        heading: "Cell background",
        backgrounds: backgroundActions,
      },
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
    } | {
      heading: string;
      backgrounds: TableContextMenuBackgroundItem[];
    }>;

    const availableSections = sections
      .map((section) => {
        if ("backgrounds" in section) {
          return section;
        }

        return {
          ...section,
          actions: section.actions.filter((action) => this.getBoolAttr(action.can)),
        };
      })
      .filter((section) => ("backgrounds" in section ? section.backgrounds.length > 0 : section.actions.length > 0));

    let html = '<div class="ui-editor-table-context-menu" role="menu">';
    availableSections.forEach((section, sectionIndex) => {
      if (sectionIndex > 0) {
        html += '<div class="ui-editor-table-context-menu__sep"></div>';
      }
      html += '<div class="ui-editor-table-context-menu__section" role="none">';
      html += `<div class="ui-editor-table-context-menu__heading" role="presentation">${section.heading}</div>`;

      if ("backgrounds" in section) {
        html += '<div class="ui-editor-table-context-menu__swatches" role="group" aria-label="Cell background">';
        section.backgrounds.forEach((background) => {
          const isSelected = (background.value ?? "") === (currentBackground ?? "");
          html += `<button type="button" class="ui-editor-table-context-menu__swatch-button" role="menuitemradio" aria-checked="${isSelected ? "true" : "false"}" data-action="${background.action}"${isSelected ? ' data-selected="true"' : ""}><span class="ui-editor-table-context-menu__swatch${background.swatch ? "" : " ui-editor-table-context-menu__swatch--default"}"${background.swatch ? ` style="--ui-editor-table-context-swatch:${background.swatch}"` : ""}></span><span class="ui-editor-table-context-menu__swatch-label">${background.label}</span></button>`;
        });
        html += "</div>";
      } else {
        section.actions.forEach((action) => {
          const tone = "tone" in action ? action.tone : undefined;
          html += `<button type="button" role="menuitem" data-action="${action.action}"${tone ? ` data-tone="${tone}"` : ""}>${action.label}</button>`;
        });
      }
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
