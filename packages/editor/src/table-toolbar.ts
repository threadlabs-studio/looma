/**
 * ui-editor-table-toolbar — lightweight structural actions for an active table.
 * Emits looma-editor-table-action, matching the table context menu contract.
 * Domain-neutral: no Tiptap dependency.
 */

import type {
  TableContextMenuAction,
  TableContextMenuActionEventDetail,
} from "./table-context-menu";
import { TABLE_CELL_BACKGROUND_OPTIONS } from "./table-backgrounds";

const TAG = "ui-editor-table-toolbar";

type TableToolbarActionItem = {
  action: TableContextMenuAction;
  label: string;
  can?: string;
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
class UIEditorTableToolbarElement extends HTMLElement {
  #overflowOpen = false;

  static get observedAttributes(): string[] {
    return [
      "open",
      "cell-alignment",
      "cell-background",
      "can-add-row-after",
      "can-add-column-after",
      "can-add-row-before",
      "can-add-column-before",
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

  private getAlignmentAttr(): TableContextMenuAction {
    const value = this.getAttribute("cell-alignment");
    if (value === "center") {
      return "align-center";
    }
    if (value === "right") {
      return "align-right";
    }
    return "align-left";
  }

  connectedCallback(): void {
    this.render();
    this.addEventListener("click", this.onClick);
    document.addEventListener("pointerdown", this.onDocumentPointerDown, true);
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this.onClick);
    document.removeEventListener("pointerdown", this.onDocumentPointerDown, true);
  }

  attributeChangedCallback(): void {
    this.render();
  }

  private onClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target) {
      return;
    }

    if (target.dataset.action === "toggle-overflow") {
      this.#overflowOpen = !this.#overflowOpen;
      this.render();
      return;
    }

    const action = target.dataset.action as TableContextMenuAction | undefined;
    if (!action) {
      return;
    }

    this.#overflowOpen = false;
    this.render();
    dispatchTableAction(this, action);
  };

  private onDocumentPointerDown = (event: PointerEvent): void => {
    if (!this.#overflowOpen) {
      return;
    }

    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    if (path.includes(this)) {
      return;
    }

    if (event.target instanceof Node && this.contains(event.target)) {
      return;
    }

    this.#overflowOpen = false;
    this.render();
  };

  private render(): void {
    const open = this.getBoolAttr("open");
    this.hidden = !open;
    if (!open) {
      this.#overflowOpen = false;
      return;
    }

    const activeAlignment = this.getAlignmentAttr();
    const currentBackground = this.getAttribute("cell-background");
    const alignmentActions = [
      { action: "align-left", label: "Left" },
      { action: "align-center", label: "Center" },
      { action: "align-right", label: "Right" },
    ] satisfies Array<{
      action: TableContextMenuAction;
      label: string;
    }>;

    const structuralActions = (
      [
        { action: "add-row-after", label: "Add row", can: "can-add-row-after" },
        { action: "add-column-after", label: "Add column", can: "can-add-column-after" },
      ] satisfies Array<{
        action: TableContextMenuAction;
        label: string;
        can: string;
      }>
    ).filter((action) => this.getBoolAttr(action.can));

    const overflowSections = [
      {
        heading: "Structure",
        actions: [
          { action: "add-row-before", label: "Add row above", can: "can-add-row-before" },
          { action: "add-column-before", label: "Add column left", can: "can-add-column-before" },
        ] satisfies TableToolbarActionItem[],
      },
      {
        heading: "Cells",
        actions: [
          { action: "clear-cells", label: "Clear selected cells" },
          { action: "merge-cells", label: "Merge selected cells", can: "can-merge-cells" },
          { action: "split-cell", label: "Split merged cell", can: "can-split-cell" },
        ] satisfies TableToolbarActionItem[],
      },
      {
        heading: "Table",
        actions: [
          { action: "delete-row", label: "Delete row", can: "can-delete-row", tone: "danger" },
          { action: "delete-column", label: "Delete column", can: "can-delete-column", tone: "danger" },
          { action: "delete-table", label: "Delete table", can: "can-delete-table", tone: "danger" },
        ] satisfies TableToolbarActionItem[],
      },
    ] satisfies Array<{
      heading: string;
      actions: TableToolbarActionItem[];
    }>;

    const availableOverflowSections = overflowSections.map((section) => ({
      ...section,
      actions: section.actions.filter((action) => !action.can || this.getBoolAttr(action.can)),
    })).filter((section) => section.actions.length > 0);

    this.innerHTML = [
      '<div class="ui-editor-table-toolbar" role="toolbar" aria-label="Table actions">',
      '<div class="ui-editor-table-toolbar__group" role="group" aria-label="Cell alignment">',
      alignmentActions
        .map(
          (action) =>
            `<button type="button" data-action="${action.action}" aria-pressed="${action.action === activeAlignment ? "true" : "false"}" data-active="${action.action === activeAlignment ? "true" : "false"}">${action.label}</button>`
        )
        .join(""),
      "</div>",
      structuralActions.length > 0 ? '<div class="ui-editor-table-toolbar__sep" aria-hidden="true"></div>' : "",
      structuralActions.length > 0 ? '<div class="ui-editor-table-toolbar__group" role="group" aria-label="Table structure">' : "",
      structuralActions
        .map(
          (action) =>
            `<button type="button" data-action="${action.action}">${action.label}</button>`
        )
        .join(""),
      structuralActions.length > 0 ? "</div>" : "",
      '<div class="ui-editor-table-toolbar__sep" aria-hidden="true"></div>',
      '<div class="ui-editor-table-toolbar__overflow">',
      `<button type="button" class="ui-editor-table-toolbar__more" data-action="toggle-overflow" aria-haspopup="menu" aria-expanded="${this.#overflowOpen ? "true" : "false"}">Table options</button>`,
      this.#overflowOpen
        ? [
            '<div class="ui-editor-table-toolbar__menu" role="menu" aria-label="More table actions">',
            '<div class="ui-editor-table-toolbar__menu-section" role="none">',
            '<div class="ui-editor-table-toolbar__menu-heading" role="presentation">Background</div>',
            '<div class="ui-editor-table-toolbar__swatches" role="group" aria-label="Cell background">',
            TABLE_CELL_BACKGROUND_OPTIONS
              .map((background) => {
                const isSelected = (background.value ?? "") === (currentBackground ?? "");
                return `<button type="button" class="ui-editor-table-toolbar__swatch-button" role="menuitemradio" aria-checked="${isSelected ? "true" : "false"}" data-action="${background.action}"${isSelected ? ' data-selected="true"' : ""}><span class="ui-editor-table-toolbar__swatch${background.swatch ? "" : " ui-editor-table-toolbar__swatch--default"}"${background.swatch ? ` style="--ui-editor-table-toolbar-swatch:${background.swatch}"` : ""}></span><span>${background.label}</span></button>`;
              })
              .join(""),
            "</div>",
            "</div>",
            availableOverflowSections
              .map((section) =>
                [
                  '<div class="ui-editor-table-toolbar__menu-section ui-editor-table-toolbar__menu-section--divided" role="none">',
                  `<div class="ui-editor-table-toolbar__menu-heading" role="presentation">${section.heading}</div>`,
                  section.actions
                    .map((action) => {
                      const tone = "tone" in action ? action.tone : undefined;
                      return `<button type="button" role="menuitem" data-action="${action.action}"${tone ? ` data-tone="${tone}"` : ""}>${action.label}</button>`;
                    })
                    .join(""),
                  "</div>",
                ].join("")
              )
              .join(""),
            "</div>",
          ].join("")
        : "",
      "</div>",
      "</div>",
    ].join("");
  }
}

if (typeof window !== "undefined" && !customElements.get(TAG)) {
  customElements.define(TAG, UIEditorTableToolbarElement);
}
}
