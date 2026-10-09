export function announceOverlayOpen(document: Document, id: unknown): void;

export function observeOverlayViewport(document: Document, update: (event?: Event) => void): () => void;
export function createViewportSurface(surface: HTMLElement, options?: { position?: () => void; bare?: boolean; preserveChrome?: boolean }): {
  show(): void;
  hide(): void;
  refresh(): void;
  destroy(): void;
};
