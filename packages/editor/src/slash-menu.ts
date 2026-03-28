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

class UIEditorSlashMenuElement extends HTMLElement {
  #open = false;
  #query = "";
  #items: SlashMenuItem[] = [];
  #selectedIndex = 0;
  #anchorRect: DOMRect | null = null;

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

  get anchorRect(): DOMRect | null {
    return this.#anchorRect;
  }

  set anchorRect(value: DOMRect | null) {
    this.#anchorRect = value instanceof DOMRect ? value : null;
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
    this.render();
  }

  disconnectedCallback(): void {
    this.removeEventListener("mousedown", this.onMouseDown);
    this.removeEventListener("click", this.onClick);
    this.removeEventListener("mouseover", this.onMouseOver);
    window.removeEventListener("resize", this.onViewportChange);
    window.removeEventListener("scroll", this.onViewportChange, true);
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
    const rect = this.#anchorRect;
    if (!rect) {
      this.style.display = "none";
      return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    this.style.display = "block";
    this.style.position = "fixed";
    this.style.zIndex = "500";

    if (viewportWidth < MOBILE_BREAKPOINT) {
      this.style.left = "0";
      this.style.right = "0";
      this.style.bottom = "0";
      this.style.top = "";
      this.style.width = "100%";
      this.style.maxHeight = "60dvh";
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
    const visible = this.#open && this.#items.length > 0 && this.#anchorRect;
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

export { UIEditorSlashMenuElement };
