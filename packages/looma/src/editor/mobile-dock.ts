import type { ViewportRect } from "./viewport";

/** The widest viewport, in CSS pixels, that gets the editing dock; the slash and mention menus use the same width. */
export const LOOMA_MOBILE_DOCK_MAX_WIDTH = 767;

/** Whether a viewport this wide gets the editing dock rather than floating tools. */
export const usesMobileDock = (viewportWidth: number) => viewportWidth <= LOOMA_MOBILE_DOCK_MAX_WIDTH;

/**
 * Where the dock sits: across the visual viewport, against its bottom edge, so an on-screen keyboard
 * pushes it up. It never rises above the viewport's top.
 */
export function mobileDockPlacement(viewport: ViewportRect, dockHeight: number): { left: number; top: number; width: number } {
  return { left: viewport.left, top: Math.max(viewport.top, viewport.bottom - dockHeight), width: viewport.width };
}

export type LoomaMobileDockMode = "formatting" | "table";

/**
 * Which controls the dock shows. A table holding the selection shows its controls, until the author
 * goes back to formatting; that choice lasts until no table is active.
 *
 * @ownership The host reports table activity and renders the mode; this owns the choice.
 */
export interface LoomaMobileDock {
  readonly mode: LoomaMobileDockMode;
  tableActive(): void;
  showFormatting(): void;
  tableInactive(): void;
}

/** Calls `onChange` with the new mode whenever it changes. */
export function createMobileDock(onChange: (mode: LoomaMobileDockMode) => void): LoomaMobileDock {
  let mode: LoomaMobileDockMode = "formatting";
  let formattingChosen = false;
  const set = (next: LoomaMobileDockMode) => {
    if (next === mode) return;
    mode = next;
    onChange(mode);
  };
  return {
    get mode() { return mode; },
    tableActive() { if (!formattingChosen) set("table"); },
    showFormatting() {
      formattingChosen = true;
      set("formatting");
    },
    tableInactive() {
      formattingChosen = false;
      set("formatting");
    },
  };
}
