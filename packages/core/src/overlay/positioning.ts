export interface ViewportRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface RectLike extends ViewportRect {}

export interface Point {
  x: number;
  y: number;
}

export interface ProximityCoordinatorOptions {
  /** Event surface for pointer tracking. Defaults to the interaction scope. */
  pointerTarget?: EventTarget;
  /** Descendants participating in proximity. */
  anchorSelector?: string;
  /** Distance outside an anchor that activates its anticipatory state. */
  nearRadius?: number;
}

export interface ProximityCoordinator {
  /** Refreshes the anchor list and its cached geometry after a layout change. */
  refresh(): void;
  /** Removes the scope-level listeners and all reflected interaction state. */
  destroy(): void;
}

export const DEFAULT_AFFORDANCE_NEAR_RADIUS = 16;

export function getVisualViewportRect(owner: Window = window): ViewportRect {
  const viewport = owner.visualViewport;
  const left = viewport?.offsetLeft ?? 0;
  const top = viewport?.offsetTop ?? 0;
  const width = viewport?.width ?? owner.innerWidth;
  const height = viewport?.height ?? owner.innerHeight;
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

export function clampRectToViewport(
  rect: RectLike,
  viewport: ViewportRect = getVisualViewportRect(),
  gutter = 0,
): Point {
  const availableWidth = Math.max(0, viewport.width - (gutter * 2));
  const availableHeight = Math.max(0, viewport.height - (gutter * 2));
  const targetLeft = rect.width > availableWidth
    ? viewport.left + gutter
    : Math.min(
        Math.max(rect.left, viewport.left + gutter),
        viewport.right - gutter - rect.width,
      );
  const targetTop = rect.height > availableHeight
    ? viewport.top + gutter
    : Math.min(
        Math.max(rect.top, viewport.top + gutter),
        viewport.bottom - gutter - rect.height,
      );
  return { x: targetLeft - rect.left, y: targetTop - rect.top };
}

export function distanceFromPointToRect(point: Point, rect: RectLike): number {
  const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
  const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
  return Math.hypot(dx, dy);
}

/**
 * Coordinates anticipatory UI within one interaction scope.
 *
 * The coordinator deliberately owns one pointer listener and one animation-frame
 * update for the whole scope. Anchors remain the only hit-testable controls; the
 * reflected state is presentation-only, so overlapping near regions do not steal
 * pointer input from each other or from surrounding content.
 */
export function createProximityCoordinator(
  scope: HTMLElement,
  options: ProximityCoordinatorOptions = {},
): ProximityCoordinator {
  const owner = scope.ownerDocument.defaultView ?? window;
  const pointerTarget = options.pointerTarget ?? scope;
  const anchorSelector = options.anchorSelector ?? "[data-ui-affordance]";
  const configuredRadius = options.nearRadius ?? DEFAULT_AFFORDANCE_NEAR_RADIUS;
  const nearRadius = Number.isFinite(configuredRadius)
    ? Math.max(0, configuredRadius)
    : DEFAULT_AFFORDANCE_NEAR_RADIUS;
  const abort = new AbortController();
  let anchors: Array<{ element: HTMLElement; rect: DOMRect }> = [];
  let frame: number | null = null;
  let point: Point | null = null;
  let geometryDirty = false;

  const clear = () => {
    for (const { element } of anchors) {
      if (element.hasAttribute("data-ui-proximity")) {
        element.removeAttribute("data-ui-proximity");
      }
    }
    if (scope.hasAttribute("data-ui-interaction")) {
      scope.removeAttribute("data-ui-interaction");
    }
  };

  const measure = () => {
    anchors = Array.from(scope.querySelectorAll<HTMLElement>(anchorSelector))
      .filter((element) => !element.hasAttribute("disabled") && element.getAttribute("aria-disabled") !== "true")
      .map((element) => ({ element, rect: element.getBoundingClientRect() }));
    geometryDirty = false;
  };

  const update = () => {
    frame = null;
    if (geometryDirty) measure();
    if (!point) {
      clear();
      return;
    }

    let engaged = false;
    for (const anchor of anchors) {
      const near = distanceFromPointToRect(point, anchor.rect) <= nearRadius;
      if (near && anchor.element.getAttribute("data-ui-proximity") !== "near") {
        anchor.element.setAttribute("data-ui-proximity", "near");
      } else if (!near && anchor.element.hasAttribute("data-ui-proximity")) {
        anchor.element.removeAttribute("data-ui-proximity");
      }
      engaged ||= near;
    }
    if (engaged && scope.getAttribute("data-ui-interaction") !== "engaged") {
      scope.setAttribute("data-ui-interaction", "engaged");
    } else if (!engaged && scope.hasAttribute("data-ui-interaction")) {
      scope.removeAttribute("data-ui-interaction");
    }
  };

  const schedule = () => {
    if (frame !== null) return;
    frame = owner.requestAnimationFrame(update);
  };

  const onPointerMove = (event: Event) => {
    const pointer = event as PointerEvent;
    if (pointer.pointerType === "touch") {
      point = null;
    } else {
      point = { x: pointer.clientX, y: pointer.clientY };
    }
    schedule();
  };

  const invalidate = () => {
    geometryDirty = true;
    schedule();
  };

  pointerTarget.addEventListener("pointermove", onPointerMove, {
    passive: true,
    signal: abort.signal,
  });
  owner.addEventListener("resize", invalidate, { passive: true, signal: abort.signal });
  owner.addEventListener("scroll", invalidate, { passive: true, capture: true, signal: abort.signal });
  owner.visualViewport?.addEventListener("resize", invalidate, { passive: true, signal: abort.signal });
  owner.visualViewport?.addEventListener("scroll", invalidate, { passive: true, signal: abort.signal });
  measure();

  return {
    refresh: invalidate,
    destroy() {
      abort.abort();
      if (frame !== null) owner.cancelAnimationFrame(frame);
      frame = null;
      point = null;
      clear();
      anchors = [];
    },
  };
}
