const stacks = new WeakMap();
let anchorSequence = 0;
const anchorBindings = new WeakMap();

function stateFor(document) {
  let state = stacks.get(document);
  if (state) return state;
  state = { records: [], modalCount: 0, listening: false };
  stacks.set(document, state);
  return state;
}

function syncScrollLock(document, state) {
  document.documentElement.toggleAttribute("data-ui-scroll-lock", state.modalCount > 0);
  if (state.modalCount > 0) document.documentElement.style.overflow = "hidden";
  else document.documentElement.style.removeProperty("overflow");
}

function requestClose(document, reason, trigger) {
  const record = stateFor(document).records.at(-1);
  if (!record || (record.dismissible === false && (reason === "escape" || reason === "light-dismiss"))) return false;
  record.requestClose(reason, trigger);
  return true;
}

function ensureListeners(document, state) {
  if (state.listening) return;
  state.onKeydown = (event) => {
    if (event.key === "Escape") requestClose(document, "escape", "keyboard");
  };
  state.onPointerdown = (event) => {
    const top = state.records.at(-1);
    if (!top || top.dismissible === false) return;
    const boundary = [top.element, ...(top.relatedElements ?? [])];
    // Light dismiss needs a press it can place: an activation with no pointer (assistive technology,
    // or a synthetic event) reports 0,0 and would otherwise read as a press outside the overlay.
    if (event.clientX === 0 && event.clientY === 0) return;
    // A modal dialog's ::backdrop reports the dialog itself as the target; a press outside its box is outside.
    const rect = top.element.getBoundingClientRect();
    const onBackdrop = event.target === top.element
      && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
    if (!onBackdrop && event.composedPath().some((target) => target instanceof Node && boundary.some((element) => element.contains(target)))) return;
    requestClose(document, "light-dismiss", "pointer");
  };
  document.addEventListener("keydown", state.onKeydown);
  document.addEventListener("pointerdown", state.onPointerdown, true);
  state.listening = true;
}

function removeListeners(document, state) {
  if (!state.listening || state.records.length) return;
  document.removeEventListener("keydown", state.onKeydown);
  document.removeEventListener("pointerdown", state.onPointerdown, true);
  state.listening = false;
}

export function openOverlay(record) {
  const document = record.element.ownerDocument;
  const state = stateFor(document);
  closeOverlay(document, record.id);
  state.records.push(record);
  if (record.modal) {
    state.modalCount += 1;
    syncScrollLock(document, state);
  }
  ensureListeners(document, state);
}

export function closeOverlay(document, id) {
  const state = stateFor(document);
  const index = state.records.findIndex((record) => record.id === id);
  if (index >= 0) {
    const [record] = state.records.splice(index, 1);
    if (record?.modal) {
      state.modalCount = Math.max(0, state.modalCount - 1);
      syncScrollLock(document, state);
    }
  }
  removeListeners(document, state);
}

export function requestTopOverlayClose(document, reason, trigger) {
  return requestClose(document, reason, trigger);
}

function topLayerOpen(surface) {
  try { return surface.matches(":popover-open"); } catch { return !surface.hidden; }
}

function show(surface) {
  surface.setAttribute("popover", "manual");
  surface.hidden = false;
  if (typeof surface.showPopover === "function" && !topLayerOpen(surface)) {
    try { surface.showPopover(); } catch {}
  }
}

function hide(surface) {
  if (typeof surface.hidePopover === "function" && topLayerOpen(surface)) {
    try { surface.hidePopover(); } catch {}
  }
  surface.hidden = true;
}

function bindAnchor(anchor, name) {
  const binding = anchorBindings.get(anchor) ?? { original: anchor.style.getPropertyValue("anchor-name"), names: new Set() };
  binding.names.add(name);
  anchorBindings.set(anchor, binding);
  anchor.style.setProperty("anchor-name", [binding.original, ...binding.names].filter(Boolean).join(", "));
}

function unbindAnchor(anchor, name) {
  const binding = anchorBindings.get(anchor);
  if (!binding) return;
  binding.names.delete(name);
  if (binding.names.size) anchor.style.setProperty("anchor-name", [binding.original, ...binding.names].filter(Boolean).join(", "));
  else {
    if (binding.original) anchor.style.setProperty("anchor-name", binding.original);
    else anchor.style.removeProperty("anchor-name");
    anchorBindings.delete(anchor);
  }
}

function viewport(owner) {
  const visual = owner.visualViewport;
  const left = visual?.offsetLeft ?? 0;
  const top = visual?.offsetTop ?? 0;
  const width = visual?.width ?? owner.innerWidth;
  const height = visual?.height ?? owner.innerHeight;
  return { left, top, right: left + width, bottom: top + height, width, height };
}

function clamp(rect, bounds, gutter) {
  const availableWidth = Math.max(0, bounds.width - gutter * 2);
  const availableHeight = Math.max(0, bounds.height - gutter * 2);
  const left = rect.width > availableWidth ? bounds.left + gutter : Math.min(Math.max(rect.left, bounds.left + gutter), bounds.right - gutter - rect.width);
  const top = rect.height > availableHeight ? bounds.top + gutter : Math.min(Math.max(rect.top, bounds.top + gutter), bounds.bottom - gutter - rect.height);
  return { x: left - rect.left, y: top - rect.top };
}

// Entry transitions scale and nudge the surface; measure its untransformed layout box so a position
// computed mid-animation is not shrunk or offset (offsetWidth/Height ignore transforms).
function layoutRect(surface) {
  const box = surface.getBoundingClientRect();
  const width = surface.offsetWidth || box.width;
  const height = surface.offsetHeight || box.height;
  const left = box.left + (box.width - width) / 2;
  const top = box.top + (box.height - height) / 2;
  return { left, top, right: left + width, bottom: top + height, width, height };
}

function fallbackPosition(surface, anchor, placement, gap, viewportGap, surfaceRect = layoutRect(surface)) {
  const bounds = viewport(surface.ownerDocument.defaultView);
  const preferTop = placement.startsWith("top");
  const preferEnd = placement.endsWith("end");
  const below = bounds.bottom - anchor.bottom - viewportGap;
  const above = anchor.top - bounds.top - viewportGap;
  const useTop = preferTop ? !(above < surfaceRect.height + gap && below > above) : below < surfaceRect.height + gap && above > below;
  const top = useTop ? anchor.top - surfaceRect.height - gap : anchor.bottom + gap;
  const left = preferEnd ? anchor.right - surfaceRect.width : anchor.left;
  const shift = clamp({ left, top, right: left + surfaceRect.width, bottom: top + surfaceRect.height, width: surfaceRect.width, height: surfaceRect.height }, bounds, viewportGap);
  surface.style.left = `${Math.round(left + shift.x)}px`;
  surface.style.top = `${Math.round(top + shift.y)}px`;
  surface.style.right = "auto";
  surface.style.bottom = "auto";
}

export function createAnchoredSurface(surface, options = {}) {
  const owner = surface.ownerDocument.defaultView;
  let placement = options.placement ?? "bottom-start";
  const gap = Math.max(0, options.gap ?? 4);
  const viewportGap = Math.max(0, options.viewportGap ?? 8);
  const nativeAnchor = owner.CSS?.supports?.("anchor-name: --ui-anchor-test") && owner.CSS.supports("position-anchor: --ui-anchor-test") && owner.CSS.supports("top: anchor(bottom)");
  const anchorName = `--ui-anchor-${++anchorSequence}`;
  let anchor = options.anchor ?? null;
  let point = null;
  let open = false;
  let frame = null;
  let abort = null;
  let sizeObserver = null;
  surface.setAttribute("popover", "manual");
  surface.dataset.uiPositioning = nativeAnchor ? "anchor" : "fallback";
  surface.style.position = "fixed";
  surface.style.margin = "0";
  const bind = (next) => {
    if (anchor) unbindAnchor(anchor, anchorName);
    anchor = next;
    if (anchor) {
      bindAnchor(anchor, anchorName);
      surface.style.setProperty("position-anchor", anchorName);
    } else surface.style.removeProperty("position-anchor");
  };
  const position = () => {
    frame = null;
    if (!open) return;
    if (point) {
      fallbackPosition(surface, { left: point.x, right: point.x, top: point.y, bottom: point.y, width: 0, height: 0 }, "bottom-start", gap, viewportGap);
      return;
    }
    if (!anchor) return;
    let rect;
    if (nativeAnchor) {
      const blockEnd = placement.startsWith("bottom");
      const inlineEnd = placement.endsWith("end");
      surface.style.top = blockEnd ? `calc(anchor(bottom) + ${gap}px)` : "auto";
      surface.style.bottom = blockEnd ? "auto" : `calc(anchor(top) + ${gap}px)`;
      surface.style.left = inlineEnd ? "auto" : "anchor(left)";
      surface.style.right = inlineEnd ? "anchor(right)" : "auto";
      surface.style.setProperty("position-try-fallbacks", "flip-block, flip-inline");
      rect = layoutRect(surface);
      if (!rect.width || !rect.height) return;
      const shift = clamp(rect, viewport(owner), viewportGap);
      if (!shift.x && !shift.y) return;
    }
    fallbackPosition(surface, anchor.getBoundingClientRect(), placement, gap, viewportGap, rect);
  };
  const schedule = () => {
    if (open && frame === null) frame = owner.requestAnimationFrame(position);
  };
  const syncListeners = () => {
    const needed = open && (point || anchor);
    if (!needed) {
      abort?.abort();
      abort = null;
      return;
    }
    if (abort) return;
    abort = new AbortController();
    const signal = abort.signal;
    owner.addEventListener("resize", schedule, { passive: true, signal });
    owner.addEventListener("scroll", schedule, { passive: true, capture: true, signal });
    owner.visualViewport?.addEventListener("resize", schedule, { passive: true, signal });
    owner.visualViewport?.addEventListener("scroll", schedule, { passive: true, signal });
  };
  const observeSize = () => {
    if (sizeObserver || !owner.ResizeObserver) return;
    sizeObserver = new owner.ResizeObserver(schedule);
    sizeObserver.observe(surface);
  };
  const stopSize = () => { sizeObserver?.disconnect(); sizeObserver = null; };
  bind(anchor);
  return {
    setAnchor(next) { point = null; bind(next); syncListeners(); schedule(); },
    setPlacement(next) { placement = next || "bottom-start"; schedule(); },
    show() { point = null; open = true; syncListeners(); show(surface); position(); schedule(); observeSize(); },
    showAtPoint(next) { point = next; open = true; syncListeners(); show(surface); position(); schedule(); observeSize(); },
    hide() { open = false; point = null; syncListeners(); stopSize(); if (frame !== null) owner.cancelAnimationFrame(frame); frame = null; hide(surface); },
    refresh: schedule,
    destroy() { open = false; abort?.abort(); abort = null; stopSize(); if (frame !== null) owner.cancelAnimationFrame(frame); frame = null; hide(surface); bind(null); },
  };
}

/**
 * Resolves `for`-style ID references that may not exist yet. `get(id)` returns the element or, when
 * it is missing, watches the document and calls `onLate` once an element with that ID appears
 * (examples, templates, and frameworks often render the trigger after the overlay).
 */
export function createIdResolver(document, onLate) {
  let observer = null;
  let waiting = "";
  const stop = () => {
    observer?.disconnect();
    observer = null;
    waiting = "";
  };
  const get = (id) => {
    const found = id ? document.getElementById(id) : null;
    if (found || !id) {
      if (waiting) stop();
      return found;
    }
    if (waiting === id) return null;
    stop();
    waiting = id;
    observer = new MutationObserver(() => {
      if (!document.getElementById(waiting)) return;
      stop();
      onLate();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["id"] });
    return null;
  };
  return { get, stop };
}
