export function announceOverlayOpen(document: Document, id: unknown): void;

export function observeOverlayViewport(document: Document, update: (event?: Event) => void): () => void;
export function createViewportSurface(surface: HTMLElement, options?: { position?: () => void; bare?: boolean; preserveChrome?: boolean }): {
  show(): void;
  hide(): void;
  refresh(): void;
  destroy(): void;
};

type OverlayCloseReason = "escape" | "light-dismiss" | "programmatic" | "action";

export interface OverlayRecord {
  id: unknown;
  modal: boolean;
  element: HTMLElement;
  relatedElements?: HTMLElement[];
  dismissible?: boolean;
  requestClose(reason: OverlayCloseReason, trigger?: string): void;
}
export function openOverlay(record: OverlayRecord): void;
export function closeOverlay(document: Document, id: unknown): void;

type AnchorRect = { left: number; top: number; right: number; bottom: number; width: number; height: number };
export function createAnchoredSurface(surface: HTMLElement, options?: {
  anchor?: HTMLElement | (() => AnchorRect | null) | null;
  placement?: string;
  gap?: number | (() => number);
  viewportGap?: number;
  boundary?: HTMLElement | (() => HTMLElement | null) | null;
  maxWidth?: number | (() => number | null) | null;
  bare?: boolean;
}): {
  setAnchor(anchor: HTMLElement | (() => AnchorRect | null) | null): void;
  setPlacement(placement: string): void;
  show(): void;
  showAtPoint(point: { x: number; y: number }): void;
  hide(): void;
  refresh(): void;
  destroy(): void;
};
