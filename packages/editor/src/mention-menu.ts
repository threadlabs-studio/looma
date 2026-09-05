/** ui-editor-mention-menu — bounded, accessible mention suggestions. */

import { getVisualViewportRect } from "@threadlabs/looma-core";
import {
  MAX_MENTION_RESULT_LIMIT,
  type LoomaMentionItem,
} from "./mention-contract";
import type { SlashMenuAnchorRect } from "./slash-menu";

const TAG = "ui-editor-mention-menu";
const MOBILE_BREAKPOINT = 768;
const MENU_HEIGHT_ESTIMATE = 320;
const MENU_WIDTH = 320;
const OFFSET = 8;

export interface MentionMenuHighlightEventDetail {
  index: number;
}

export interface MentionMenuSelectEventDetail {
  index: number;
}

interface NormalizedAnchorRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function finiteCoordinate(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeAnchorRect(value: SlashMenuAnchorRect | null): NormalizedAnchorRect | null {
  if (!value || typeof value !== "object") return null;
  const rect = value as Partial<DOMRectReadOnly>;
  const x = finiteCoordinate(rect.x);
  const y = finiteCoordinate(rect.y);
  const width = finiteCoordinate(rect.width);
  const height = finiteCoordinate(rect.height);
  const left = finiteCoordinate(rect.left) ?? x;
  const top = finiteCoordinate(rect.top) ?? y;
  const right = finiteCoordinate(rect.right) ?? (left !== null && width !== null ? left + width : null);
  const bottom = finiteCoordinate(rect.bottom) ?? (top !== null && height !== null ? top + height : null);
  return left === null || top === null || right === null || bottom === null
    ? null
    : { left, top, right, bottom };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function dispatchMenuEvent<T>(element: HTMLElement, name: string, detail: T): void {
  element.dispatchEvent(new CustomEvent<T>(name, { detail, bubbles: true, composed: true }));
}

if (typeof HTMLElement !== "undefined") {
class UIEditorMentionMenuElement extends HTMLElement {
  #open = false;
  #query = "";
  #items: LoomaMentionItem[] = [];
  #selectedIndex = 0;
  #loading = false;
  #anchorRect: SlashMenuAnchorRect | null = null;
  #normalizedAnchorRect: NormalizedAnchorRect | null = null;

  get open(): boolean { return this.#open; }
  set open(value: boolean) { this.#open = Boolean(value); this.render(); }
  get query(): string { return this.#query; }
  set query(value: string) { this.#query = typeof value === "string" ? value : ""; this.render(); }
  get items(): LoomaMentionItem[] { return this.#items; }
  set items(value: LoomaMentionItem[]) {
    this.#items = Array.isArray(value)
      ? value.slice(0, MAX_MENTION_RESULT_LIMIT)
      : [];
    if (this.#selectedIndex >= this.#items.length) this.#selectedIndex = 0;
    this.render();
  }
  get selectedIndex(): number { return this.#selectedIndex; }
  set selectedIndex(value: number) {
    this.#selectedIndex = Number.isFinite(value) ? Math.max(0, value) : 0;
    this.render();
  }
  get loading(): boolean { return this.#loading; }
  set loading(value: boolean) { this.#loading = Boolean(value); this.render(); }
  get anchorRect(): SlashMenuAnchorRect | null { return this.#anchorRect; }
  set anchorRect(value: SlashMenuAnchorRect | null) {
    const normalized = normalizeAnchorRect(value);
    this.#anchorRect = normalized ? value : null;
    this.#normalizedAnchorRect = normalized;
    this.render();
  }

  connectedCallback(): void {
    this.setAttribute("role", "listbox");
    this.setAttribute("aria-label", "Mention a person");
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

  private onMouseDown = (event: MouseEvent): void => event.preventDefault();

  private onClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-index]");
    const index = Number.parseInt(target?.dataset.index ?? "", 10);
    if (Number.isFinite(index)) {
      dispatchMenuEvent<MentionMenuSelectEventDetail>(
        this,
        "looma-editor-mention-menu-select",
        { index },
      );
    }
  };

  private onMouseOver = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-index]");
    const index = Number.parseInt(target?.dataset.index ?? "", 10);
    if (!Number.isFinite(index) || index === this.#selectedIndex) return;
    this.#selectedIndex = index;
    dispatchMenuEvent<MentionMenuHighlightEventDetail>(
      this,
      "looma-editor-mention-menu-highlight",
      { index },
    );
    this.render();
  };

  private onViewportChange = (): void => {
    if (this.#open) this.applyHostPosition();
  };

  private applyHostPosition(): void {
    const rect = this.#normalizedAnchorRect;
    if (!rect) { this.style.display = "none"; return; }
    const viewport = getVisualViewportRect(window);
    this.style.display = "block";
    this.style.position = "fixed";
    this.style.zIndex = "500";

    if (window.innerWidth < MOBILE_BREAKPOINT) {
      const toolbarReserve = 56;
      const height = Math.min(MENU_HEIGHT_ESTIMATE, Math.max(0, viewport.height - toolbarReserve));
      this.style.left = `${viewport.left}px`;
      this.style.top = `${viewport.top + viewport.height - height - toolbarReserve}px`;
      this.style.right = "";
      this.style.bottom = "";
      this.style.width = `${viewport.width}px`;
      this.style.maxHeight = `${height}px`;
      return;
    }

    const spaceBelow = viewport.bottom - rect.bottom - OFFSET;
    const spaceAbove = rect.top - viewport.top - OFFSET;
    const top = spaceBelow >= MENU_HEIGHT_ESTIMATE || spaceBelow >= spaceAbove
      ? rect.bottom + OFFSET
      : rect.top - OFFSET - MENU_HEIGHT_ESTIMATE;
    const left = Math.max(
      viewport.left + 8,
      Math.min(rect.left, viewport.right - MENU_WIDTH - 8),
    );
    this.style.top = `${Math.max(viewport.top + 8, top)}px`;
    this.style.left = `${left}px`;
    this.style.right = "";
    this.style.bottom = "";
    this.style.width = `${MENU_WIDTH}px`;
    this.style.maxHeight = "";
  }

  private render(): void {
    const visible = this.#open
      && (this.#loading || this.#items.length > 0)
      && this.#normalizedAnchorRect;
    this.hidden = !visible;
    if (!visible) return;
    this.applyHostPosition();

    const optionIdPrefix = this.id || TAG;
    const selectedId = `${optionIdPrefix}-option-${this.#selectedIndex}`;
    this.setAttribute("aria-busy", this.#loading ? "true" : "false");
    if (this.#items.length > 0) this.setAttribute("aria-activedescendant", selectedId);
    else this.removeAttribute("aria-activedescendant");

    const items = this.#items.map((item, index) => {
      const selected = index === this.#selectedIndex;
      return [
        `<li id="${optionIdPrefix}-option-${index}" class="ui-editor-mention-menu__item${selected ? " ui-editor-mention-menu__item--active" : ""}"`,
        ` role="option" aria-selected="${selected}" data-index="${index}">`,
        `<span class="ui-editor-mention-menu__avatar" aria-hidden="true">${escapeHtml(item.initials ?? item.label.slice(0, 2).toUpperCase())}</span>`,
        `<span class="ui-editor-mention-menu__body">`,
        `<span class="ui-editor-mention-menu__label">${escapeHtml(item.label)}</span>`,
        item.detail ? `<span class="ui-editor-mention-menu__detail">${escapeHtml(item.detail)}</span>` : "",
        `</span></li>`,
      ].join("");
    }).join("");

    this.innerHTML = [
      `<div class="ui-editor-mention-menu">`,
      `<div class="ui-editor-mention-menu__header">`,
      `<span>People</span><span class="ui-editor-mention-menu__hint">Type after @ to search</span>`,
      `</div>`,
      this.#loading && this.#items.length === 0
        ? `<div class="ui-editor-mention-menu__loading" role="status">Searching…</div>`
        : `<ul class="ui-editor-mention-menu__list" role="presentation">${items}</ul>`,
      `</div>`,
    ].join("");
  }
}

if (typeof window !== "undefined" && !customElements.get(TAG)) {
  customElements.define(TAG, UIEditorMentionMenuElement);
}
}
