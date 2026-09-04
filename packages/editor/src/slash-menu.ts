/**
 * ui-editor-slash-menu — floating slash-command menu.
 * Apps own the command list and suggestion state; Looma owns the chrome.
 */

const TAG = "ui-editor-slash-menu";
const MOBILE_BREAKPOINT = 768;
const MENU_HEIGHT_ESTIMATE = 320;
const MENU_WIDTH = 280;
const OFFSET = 8;

export interface SlashMenuItem {
  title: string;
  description: string;
  icon: string;
}

export interface SlashMenuHighlightEventDetail {
  index: number;
}

export interface SlashMenuSelectEventDetail {
  index: number;
}

/**
 * A viewport rectangle accepted by the slash-menu anchor.
 *
 * Browser DOMRect objects satisfy both variants. Plain rectangles from Tiptap
 * and ProseMirror are also supported when they provide either edge coordinates
 * or an origin plus dimensions.
 */
export type SlashMenuAnchorRect =
  | Pick<DOMRectReadOnly, "left" | "top" | "right" | "bottom">
  | Pick<DOMRectReadOnly, "x" | "y" | "width" | "height">;

interface NormalizedSlashMenuAnchorRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function finiteCoordinate(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeAnchorRect(
  value: SlashMenuAnchorRect | null,
): NormalizedSlashMenuAnchorRect | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const rect = value as Partial<DOMRectReadOnly>;
  const x = finiteCoordinate(rect.x);
  const y = finiteCoordinate(rect.y);
  const width = finiteCoordinate(rect.width);
  const height = finiteCoordinate(rect.height);
  const left = finiteCoordinate(rect.left) ?? x;
  const top = finiteCoordinate(rect.top) ?? y;
  const right = finiteCoordinate(rect.right) ??
    (left !== null && width !== null ? left + width : null);
  const bottom = finiteCoordinate(rect.bottom) ??
    (top !== null && height !== null ? top + height : null);

  if (left === null || top === null || right === null || bottom === null) {
    return null;
  }

  return { left, top, right, bottom };
}

function dispatchSlashMenuEvent<T>(element: HTMLElement, name: string, detail: T): void {
  element.dispatchEvent(
    new CustomEvent<T>(name, {
      detail,
      bubbles: true,
      composed: true,
    })
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

if (typeof HTMLElement !== "undefined") {
class UIEditorSlashMenuElement extends HTMLElement {
  #open = false;
  #query = "";
  #items: SlashMenuItem[] = [];
  #selectedIndex = 0;
  #anchorRect: SlashMenuAnchorRect | null = null;
  #normalizedAnchorRect: NormalizedSlashMenuAnchorRect | null = null;

  get open(): boolean {
    return this.#open;
  }

  set open(value: boolean) {
    this.#open = Boolean(value);
    this.render();
  }

  get query(): string {
    return this.#query;
  }

  set query(value: string) {
    this.#query = typeof value === "string" ? value : "";
    this.render();
  }

  get items(): SlashMenuItem[] {
    return this.#items;
  }

  set items(value: SlashMenuItem[]) {
    this.#items = Array.isArray(value) ? value : [];
    this.render();
  }

  get selectedIndex(): number {
    return this.#selectedIndex;
  }

  set selectedIndex(value: number) {
    this.#selectedIndex = Number.isFinite(value) ? Math.max(0, value) : 0;
    this.render();
  }

  get anchorRect(): SlashMenuAnchorRect | null {
    return this.#anchorRect;
  }

  set anchorRect(value: SlashMenuAnchorRect | null) {
    const normalized = normalizeAnchorRect(value);
    this.#anchorRect = normalized ? value : null;
    this.#normalizedAnchorRect = normalized;
    this.render();
  }

  connectedCallback(): void {
    this.setAttribute("role", "listbox");
    this.setAttribute("aria-label", "Insert block");
    this.addEventListener("mousedown", this.onMouseDown);
    this.addEventListener("click", this.onClick);
    this.addEventListener("mouseover", this.onMouseOver);
    window.addEventListener("resize", this.onViewportChange);
    window.addEventListener("scroll", this.onViewportChange, true);
    window.visualViewport?.addEventListener("resize", this.onViewportChange);
    window.visualViewport?.addEventListener("scroll", this.onViewportChange);
    this.render();
  }

  disconnectedCallback(): void {
    this.removeEventListener("mousedown", this.onMouseDown);
    this.removeEventListener("click", this.onClick);
    this.removeEventListener("mouseover", this.onMouseOver);
    window.removeEventListener("resize", this.onViewportChange);
    window.removeEventListener("scroll", this.onViewportChange, true);
    window.visualViewport?.removeEventListener("resize", this.onViewportChange);
    window.visualViewport?.removeEventListener("scroll", this.onViewportChange);
  }

  private onMouseDown = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private onClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-index]");
    if (!target) {
      return;
    }

    const index = Number.parseInt(target.dataset.index ?? "", 10);
    if (!Number.isFinite(index)) {
      return;
    }

    dispatchSlashMenuEvent<SlashMenuSelectEventDetail>(this, "looma-editor-slash-menu-select", {
      index,
    });
  };

  private onMouseOver = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-index]");
    if (!target) {
      return;
    }

    const index = Number.parseInt(target.dataset.index ?? "", 10);
    if (!Number.isFinite(index) || index === this.#selectedIndex) {
      return;
    }

    this.#selectedIndex = index;
    this.render();
    dispatchSlashMenuEvent<SlashMenuHighlightEventDetail>(
      this,
      "looma-editor-slash-menu-highlight",
      { index }
    );
  };

  private onViewportChange = (): void => {
    if (this.#open) {
      this.applyHostPosition();
    }
  };

  private applyHostPosition(): void {
    const rect = this.#normalizedAnchorRect;
    if (!rect) {
      this.style.display = "none";
      return;
    }

    const visualViewport = window.visualViewport;
    const viewportWidth = visualViewport?.width ?? window.innerWidth;
    const viewportHeight = visualViewport?.height ?? window.innerHeight;

    this.style.display = "block";
    this.style.position = "fixed";
    this.style.zIndex = "500";

    if (window.innerWidth < MOBILE_BREAKPOINT) {
      const toolbarReserve = 56;
      const menuHeight = Math.min(
        MENU_HEIGHT_ESTIMATE,
        Math.max(0, viewportHeight - toolbarReserve),
      );
      this.style.left = `${visualViewport?.offsetLeft ?? 0}px`;
      this.style.right = "";
      this.style.bottom = "";
      this.style.top = `${(visualViewport?.offsetTop ?? 0) + viewportHeight - menuHeight - toolbarReserve}px`;
      this.style.width = `${viewportWidth}px`;
      this.style.maxHeight = `${menuHeight}px`;
      return;
    }

    let top: number;
    const spaceBelow = viewportHeight - rect.bottom - OFFSET;
    const spaceAbove = rect.top - OFFSET;

    if (spaceBelow >= MENU_HEIGHT_ESTIMATE || spaceBelow >= spaceAbove) {
      top = rect.bottom + OFFSET;
    } else {
      top = rect.top - OFFSET - MENU_HEIGHT_ESTIMATE;
    }

    let left = rect.left;
    if (left + MENU_WIDTH > viewportWidth - 8) {
      left = viewportWidth - MENU_WIDTH - 8;
    }
    if (left < 8) {
      left = 8;
    }

    this.style.top = `${Math.max(8, top)}px`;
    this.style.left = `${left}px`;
    this.style.right = "";
    this.style.bottom = "";
    this.style.width = `${MENU_WIDTH}px`;
    this.style.maxHeight = "";
  }

  private render(): void {
    const visible = this.#open && this.#items.length > 0 && this.#normalizedAnchorRect;
    this.hidden = !visible;

    if (!visible) {
      return;
    }

    this.applyHostPosition();

    const query = this.#query.trim();
    const items = this.#items
      .map((item, index) => {
        const activeClass =
          index === this.#selectedIndex ? " ui-editor-slash-menu__item--active" : "";
        return [
          `<li`,
          ` class="ui-editor-slash-menu__item${activeClass}"`,
          ` role="option"`,
          ` aria-selected="${index === this.#selectedIndex ? "true" : "false"}"`,
          ` data-index="${index}"`,
          `>`,
          `<span class="ui-editor-slash-menu__icon" aria-hidden="true">${escapeHtml(item.icon)}</span>`,
          `<span class="ui-editor-slash-menu__body">`,
          `<span class="ui-editor-slash-menu__title">${escapeHtml(item.title)}</span>`,
          `<span class="ui-editor-slash-menu__description">${escapeHtml(item.description)}</span>`,
          `</span>`,
          `</li>`,
        ].join("");
      })
      .join("");

    this.innerHTML = [
      `<div class="ui-editor-slash-menu">`,
      `<div class="ui-editor-slash-menu__header" aria-hidden="true">`,
      `<span class="ui-editor-slash-menu__header-label">Insert</span>`,
      query
        ? `<span class="ui-editor-slash-menu__header-query">${escapeHtml(query)}</span>`
        : "",
      `</div>`,
      `<ul class="ui-editor-slash-menu__list" role="presentation">${items}</ul>`,
      `<div class="ui-editor-slash-menu__footer" aria-hidden="true">`,
      `<kbd>↑↓</kbd> navigate &nbsp;·&nbsp; <kbd>↵</kbd> insert &nbsp;·&nbsp; <kbd>Esc</kbd> close`,
      `</div>`,
      `</div>`,
    ].join("");
  }
}

if (typeof window !== "undefined" && !customElements.get(TAG)) {
  customElements.define(TAG, UIEditorSlashMenuElement);
}
}
