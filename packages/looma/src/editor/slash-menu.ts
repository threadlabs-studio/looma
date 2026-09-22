/** Public data and event contracts for the declarative slash-command menu. */

import type { LoomaIconName } from "./icons";

/**
 * Presentation projection of a slash command.
 * It intentionally omits editor callbacks: the menu emits an index and the
 * headless extension executes the command from its current ephemeral snapshot.
 */
export interface SlashMenuItem {
  title: string;
  description: string;
  icon: LoomaIconName;
}

/** Pointer-hover request; selection remains owned by the suggestion extension. */
export interface SlashMenuHighlightEventDetail {
  index: number;
}

/** Activation request for an item in the current published snapshot. */
export interface SlashMenuSelectEventDetail {
  index: number;
}

/**
 * A viewport rectangle accepted by the slash-menu anchor.
 *
 * Browser DOMRect objects satisfy both variants. Plain rectangles from Tiptap
 * and ProseMirror are also supported when they provide either edge coordinates
 * or an origin plus dimensions. Values use CSS-pixel viewport coordinates; the
 * menu converts them into visual-viewport-aware fixed positioning.
 */
export type SlashMenuAnchorRect =
  | Pick<DOMRectReadOnly, "left" | "top" | "right" | "bottom">
  | Pick<DOMRectReadOnly, "x" | "y" | "width" | "height">;
