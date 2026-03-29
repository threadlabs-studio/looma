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
      "cell-alignment",
      "can-add-row-after",
      "can-add-column-after",
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

    const activeAlignment = this.getAlignmentAttr();
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
      "</div>",
    ].join("");
  }
}

if (typeof window !== "undefined" && !customElements.get(TAG)) {
  customElements.define(TAG, UIEditorTableToolbarElement);
}
}
