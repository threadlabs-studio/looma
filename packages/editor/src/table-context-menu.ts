/**
 * ui-editor-table-context-menu — web component for table cell context menu.
 * Emits custom events for each action; the adapter (Vue/React) wires Tiptap commands.
 * Domain-neutral: no Tiptap dependency.
 */

import {
  TABLE_CELL_BACKGROUND_OPTIONS,
  type TableCellBackgroundAction,
} from "./table-backgrounds";
import {
  clampRectToViewport,
  getVisualViewportRect,
  loomaIconMarkup,
  type LoomaIconName,
} from "@threadlabs/looma-core";

const TAG = "ui-editor-table-context-menu";

export type TableContextMenuAction =
  | "align-left"
  | "align-center"
  | "align-right"
  | TableCellBackgroundAction
  | "add-row-before"
  | "add-row-after"
  | "add-column-before"
  | "add-column-after"
  | "delete-row"
  | "delete-column"
  | "delete-table"
  | "clear-cells"
  | "merge-cells"
  | "split-cell";

export interface TableContextMenuActionEventDetail {
  action: TableContextMenuAction;
}

type TableContextMenuItem = {
  action: TableContextMenuAction;
  label: string;
  icon: LoomaIconName;
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
class UIEditorTableContextMenuElement extends HTMLElement {
  private positionFrame: number | null = null;

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
    window.addEventListener("resize", this.scheduleViewportPosition);
    window.visualViewport?.addEventListener("resize", this.scheduleViewportPosition);
    window.visualViewport?.addEventListener("scroll", this.scheduleViewportPosition);
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this.onClick);
    window.removeEventListener("resize", this.scheduleViewportPosition);
    window.visualViewport?.removeEventListener("resize", this.scheduleViewportPosition);
    window.visualViewport?.removeEventListener("scroll", this.scheduleViewportPosition);
    if (this.positionFrame !== null) {
      cancelAnimationFrame(this.positionFrame);
      this.positionFrame = null;
    }
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

  private positionWithinViewport = (): void => {
    this.positionFrame = null;
    const menu = this.querySelector<HTMLElement>(".ui-editor-table-context-menu");
    if (!menu) return;

    menu.style.translate = "";
    const rect = menu.getBoundingClientRect();
    const { x: offsetX, y: offsetY } = clampRectToViewport(
      rect,
      getVisualViewportRect(window),
      12,
    );

    if (offsetX !== 0 || offsetY !== 0) {
      menu.style.translate = `${offsetX}px ${offsetY}px`;
    }
  };

  private scheduleViewportPosition = (): void => {
    if (!this.isConnected) return;
    if (this.positionFrame !== null) cancelAnimationFrame(this.positionFrame);
    this.positionFrame = requestAnimationFrame(this.positionWithinViewport);
  };

  private render(): void {
    const open = this.getBoolAttr("open");
    this.hidden = !open;
    if (!open) return;

    const currentBackground = this.getAttribute("cell-background");

    const sections = [
      {
        heading: "Cell background",
        backgrounds: TABLE_CELL_BACKGROUND_OPTIONS,
      },
      {
        heading: "Structure",
        actions: [
          { action: "add-row-before", label: "Add row above", icon: "panel-top", can: "can-add-row-before" },
          { action: "add-row-after", label: "Add row below", icon: "panel-bottom", can: "can-add-row-after" },
          { action: "add-column-before", label: "Add column left", icon: "panel-left", can: "can-add-column-before" },
          { action: "add-column-after", label: "Add column right", icon: "panel-right", can: "can-add-column-after" },
        ] satisfies TableContextMenuItem[],
      },
      {
        heading: "Cells",
        actions: [
          { action: "clear-cells", label: "Clear selected cells", icon: "eraser" },
          { action: "merge-cells", label: "Merge cells", icon: "merge", can: "can-merge-cells" },
          { action: "split-cell", label: "Split cell", icon: "split", can: "can-split-cell" },
        ] satisfies TableContextMenuItem[],
      },
      {
        heading: "Table",
        actions: [
          { action: "delete-row", label: "Delete row", icon: "trash", can: "can-delete-row", tone: "danger" },
          { action: "delete-column", label: "Delete column", icon: "trash", can: "can-delete-column", tone: "danger" },
          { action: "delete-table", label: "Delete table", icon: "trash", can: "can-delete-table", tone: "danger" },
        ] satisfies TableContextMenuItem[],
      },
    ] satisfies Array<{
      heading: string;
      actions: TableContextMenuItem[];
    } | {
      heading: string;
      backgrounds: typeof TABLE_CELL_BACKGROUND_OPTIONS;
    }>;

    const availableSections = sections
      .map((section) => {
        if ("backgrounds" in section) {
          return section;
        }

        return {
          ...section,
          actions: section.actions.filter((action) => !action.can || this.getBoolAttr(action.can)),
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
          html += `<button type="button" role="menuitem" data-action="${action.action}"${tone ? ` data-tone="${tone}"` : ""}>${loomaIconMarkup(action.icon)}<span>${action.label}</span></button>`;
        });
      }
      html += "</div>";
    });
    html += "</div>";

    this.innerHTML = html;
    this.scheduleViewportPosition();
  }
}

if (typeof window !== "undefined" && !customElements.get(TAG)) {
  customElements.define(TAG, UIEditorTableContextMenuElement);
}
}
