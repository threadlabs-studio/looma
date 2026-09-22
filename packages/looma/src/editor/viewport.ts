/** A viewport rectangle in client coordinates. */
export interface ViewportRect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

/** The visual viewport (what is on screen, net of the on-screen keyboard and pinch zoom). */
export function getVisualViewportRect(owner: Window = window): ViewportRect {
  const viewport = owner.visualViewport;
  const left = viewport?.offsetLeft ?? 0;
  const top = viewport?.offsetTop ?? 0;
  const width = viewport?.width ?? owner.innerWidth;
  const height = viewport?.height ?? owner.innerHeight;
  return { left, top, right: left + width, bottom: top + height, width, height };
}
