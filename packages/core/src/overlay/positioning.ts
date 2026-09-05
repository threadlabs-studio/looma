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

export type AnchoredPlacement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

export interface AnchoredSurfaceOptions {
  anchor?: HTMLElement | null;
  placement?: AnchoredPlacement;
  gap?: number;
  viewportGap?: number;
}

export interface AnchoredSurface {
  setAnchor(anchor: HTMLElement | null): void;
  show(): void;
  showAtPoint(point: Point): void;
  hide(): void;
  refresh(): void;
  destroy(): void;
}

export interface ViewportSurface {
  show(): void;
  hide(): void;
  destroy(): void;
}

export const DEFAULT_AFFORDANCE_NEAR_RADIUS = 16;

let anchorSequence = 0;
const anchorBindings = new WeakMap<HTMLElement, { original: string; names: Set<string> }>();

function bindAnchorName(anchor: HTMLElement, name: string): void {
  const binding = anchorBindings.get(anchor) ?? {
    original: anchor.style.getPropertyValue("anchor-name"),
    names: new Set<string>(),
  };
  binding.names.add(name);
  anchorBindings.set(anchor, binding);
  const values = [binding.original, ...binding.names].filter(Boolean);
  anchor.style.setProperty("anchor-name", values.join(", "));
}

function unbindAnchorName(anchor: HTMLElement, name: string): void {
  const binding = anchorBindings.get(anchor);
  if (!binding) return;
  binding.names.delete(name);
  if (binding.names.size) {
    const values = [binding.original, ...binding.names].filter(Boolean);
    anchor.style.setProperty("anchor-name", values.join(", "));
    return;
  }
  if (binding.original) anchor.style.setProperty("anchor-name", binding.original);
  else anchor.style.removeProperty("anchor-name");
  anchorBindings.delete(anchor);
}

function supportsAnchorPositioning(owner: Window): boolean {
  const css = (owner as Window & { CSS?: typeof CSS }).CSS;
  return typeof css?.supports === "function"
    && css.supports("anchor-name: --ui-anchor-test")
    && css.supports("position-anchor: --ui-anchor-test")
    && css.supports("top: anchor(bottom)");
}

function topLayerOpen(surface: HTMLElement): boolean {
  try {
    return surface.matches(":popover-open");
  } catch {
    return !surface.hidden;
  }
}

function showInTopLayer(surface: HTMLElement): void {
  surface.setAttribute("popover", "manual");
  surface.hidden = false;
  if (typeof surface.showPopover === "function" && !topLayerOpen(surface)) {
    try {
      surface.showPopover();
    } catch {
      // A disconnected or already-transitioning surface still receives the
      // fixed-position fallback below and will be retried on the next sync.
    }
  }
}

function hideFromTopLayer(surface: HTMLElement): void {
  if (typeof surface.hidePopover === "function" && topLayerOpen(surface)) {
    try {
      surface.hidePopover();
    } catch {
      // The surface may have been disconnected between state and DOM updates.
    }
  }
  surface.hidden = true;
}

/**
 * Places unanchored floating UI, such as a toast region, in the browser top
 * layer. Its viewport position remains CSS-owned; the controller only provides
 * the native Popover API boundary and its no-Popover fallback.
 */
export function createViewportSurface(surface: HTMLElement): ViewportSurface {
  surface.setAttribute("popover", "manual");
  surface.dataset.uiPositioning = "viewport";

  return {
    show() {
      showInTopLayer(surface);
    },
    hide() {
      hideFromTopLayer(surface);
    },
    destroy() {
      hideFromTopLayer(surface);
    },
  };
}

function fallbackPosition(
  surface: HTMLElement,
  anchor: RectLike,
  placement: AnchoredPlacement,
  gap: number,
  viewportGap: number,
): void {
  const owner = surface.ownerDocument.defaultView ?? window;
  const viewport = getVisualViewportRect(owner);
  const rect = surface.getBoundingClientRect();
  const preferTop = placement.startsWith("top");
  const preferEnd = placement.endsWith("end");
  const spaceBelow = viewport.bottom - anchor.bottom - viewportGap;
  const spaceAbove = anchor.top - viewport.top - viewportGap;
  const useTop = preferTop
    ? !(spaceAbove < rect.height + gap && spaceBelow > spaceAbove)
    : spaceBelow < rect.height + gap && spaceAbove > spaceBelow;
  const unclampedTop = useTop
    ? anchor.top - rect.height - gap
    : anchor.bottom + gap;
  const unclampedLeft = preferEnd
    ? anchor.right - rect.width
    : anchor.left;
  const shifted = clampRectToViewport({
    left: unclampedLeft,
    top: unclampedTop,
    right: unclampedLeft + rect.width,
    bottom: unclampedTop + rect.height,
    width: rect.width,
    height: rect.height,
  }, viewport, viewportGap);

  surface.style.left = `${Math.round(unclampedLeft + shifted.x)}px`;
  surface.style.top = `${Math.round(unclampedTop + shifted.y)}px`;
  surface.style.right = "auto";
  surface.style.bottom = "auto";
}

/**
 * One lightweight positioning controller for Looma floating UI. Native
 * Popover provides the top layer and CSS Anchor Positioning follows a named
 * element. Browsers without Anchor Positioning use the same flip/shift
 * geometry through scroll/resize listeners that exist only while open.
 */
export function createAnchoredSurface(
  surface: HTMLElement,
  options: AnchoredSurfaceOptions = {},
): AnchoredSurface {
  const owner = surface.ownerDocument.defaultView ?? window;
  const placement = options.placement ?? "bottom-start";
  const gap = Math.max(0, options.gap ?? 4);
  const viewportGap = Math.max(0, options.viewportGap ?? 8);
  const nativeAnchor = supportsAnchorPositioning(owner);
  const anchorName = `--ui-anchor-${++anchorSequence}`;
  let anchor = options.anchor ?? null;
  let point: Point | null = null;
  let open = false;
  let frame: number | null = null;
  let listenerAbort: AbortController | null = null;

  surface.setAttribute("popover", "manual");
  surface.dataset.uiPositioning = nativeAnchor ? "anchor" : "fallback";
  surface.style.position = "fixed";
  surface.style.margin = "0";

  const bindAnchor = (next: HTMLElement | null) => {
    if (anchor) unbindAnchorName(anchor, anchorName);
    anchor = next;
    if (!anchor) {
      surface.style.removeProperty("position-anchor");
      return;
    }
    bindAnchorName(anchor, anchorName);
    surface.style.setProperty("position-anchor", anchorName);
  };

  const positionNative = () => {
    const blockEnd = placement.startsWith("bottom");
    const inlineEnd = placement.endsWith("end");
    surface.style.top = blockEnd ? `calc(anchor(bottom) + ${gap}px)` : "auto";
    surface.style.bottom = blockEnd ? "auto" : `calc(anchor(top) + ${gap}px)`;
    surface.style.left = inlineEnd ? "auto" : "anchor(left)";
    surface.style.right = inlineEnd ? "anchor(right)" : "auto";
    surface.style.setProperty("position-try-fallbacks", "flip-block, flip-inline");
  };

  const position = () => {
    frame = null;
    if (!open) return;
    if (point) {
      fallbackPosition(surface, {
        left: point.x,
        right: point.x,
        top: point.y,
        bottom: point.y,
        width: 0,
        height: 0,
      }, "bottom-start", gap, viewportGap);
      return;
    }
    if (!anchor) return;
    if (nativeAnchor) positionNative();
    else fallbackPosition(surface, anchor.getBoundingClientRect(), placement, gap, viewportGap);
  };

  const schedule = () => {
    if (!open || frame !== null) return;
    frame = owner.requestAnimationFrame(position);
  };

  const syncFallbackListeners = () => {
    const needsListeners = open && (point !== null || !nativeAnchor);
    if (!needsListeners) {
      listenerAbort?.abort();
      listenerAbort = null;
      return;
    }
    if (listenerAbort) return;
    listenerAbort = new AbortController();
    const signal = listenerAbort.signal;
    owner.addEventListener("resize", schedule, { passive: true, signal });
    owner.addEventListener("scroll", schedule, { passive: true, capture: true, signal });
    owner.visualViewport?.addEventListener("resize", schedule, { passive: true, signal });
    owner.visualViewport?.addEventListener("scroll", schedule, { passive: true, signal });
  };

  bindAnchor(anchor);

  return {
    setAnchor(next) {
      point = null;
      bindAnchor(next);
      syncFallbackListeners();
      schedule();
    },
    show() {
      point = null;
      open = true;
      syncFallbackListeners();
      showInTopLayer(surface);
      position();
    },
    showAtPoint(nextPoint) {
      point = nextPoint;
      open = true;
      syncFallbackListeners();
      showInTopLayer(surface);
      position();
    },
    hide() {
      open = false;
      point = null;
      syncFallbackListeners();
      if (frame !== null) owner.cancelAnimationFrame(frame);
      frame = null;
      hideFromTopLayer(surface);
    },
    refresh: schedule,
    destroy() {
      open = false;
      listenerAbort?.abort();
      listenerAbort = null;
      if (frame !== null) owner.cancelAnimationFrame(frame);
      frame = null;
      hideFromTopLayer(surface);
      bindAnchor(null);
    },
  };
}

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
