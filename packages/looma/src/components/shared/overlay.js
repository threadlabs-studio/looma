const stacks = new WeakMap();

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

function syncModalBackdrops(state) {
  const topModal = state.records.findLast((record) => record.modal);
  for (const record of state.records) {
    (record.modalElement ?? record.element).toggleAttribute("data-ui-backdrop-hidden", Boolean(record.modal && record !== topModal));
  }
}

function requestClose(document, reason, trigger) {
  const record = stateFor(document).records.at(-1);
  if (!record || (record.dismissible === false && (reason === "escape" || reason === "light-dismiss")) || record.canClose?.(reason) === false) return false;
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
  const index = state.records.findIndex((entry) => entry.id === record.id);
  if (index >= 0) {
    const previous = state.records[index];
    state.records[index] = record;
    if (previous.modal !== record.modal) {
      state.modalCount += record.modal ? 1 : -1;
      syncScrollLock(document, state);
    }
    if (previous.modalElement && previous.modalElement !== record.modalElement) previous.modalElement.removeAttribute("data-ui-backdrop-hidden");
    syncModalBackdrops(state);
    return;
  }
  state.records.push(record);
  if (record.modal) {
    state.modalCount += 1;
    syncScrollLock(document, state);
  }
  syncModalBackdrops(state);
  ensureListeners(document, state);
  announceOverlayOpen(document, record.id);
}

export function onOverlayOpen(document, listener) {
  const onOpen = (event) => listener(event.detail.id);
  document.addEventListener("ui-overlay-open", onOpen);
  return () => document.removeEventListener("ui-overlay-open", onOpen);
}

export function announceOverlayOpen(document, id) {
  document.dispatchEvent(new CustomEvent("ui-overlay-open", { detail: { id } }));
}

export function closeOverlay(document, id) {
  const state = stateFor(document);
  const index = state.records.findIndex((record) => record.id === id);
  if (index >= 0) {
    const [record] = state.records.splice(index, 1);
    (record.modalElement ?? record.element).removeAttribute("data-ui-backdrop-hidden");
    if (record?.modal) {
      state.modalCount = Math.max(0, state.modalCount - 1);
      syncScrollLock(document, state);
    }
    syncModalBackdrops(state);
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
  const [preferred, align = "center"] = placement.split("-");
  const side = ["top", "bottom", "left", "right"].includes(preferred) ? preferred : "bottom";
  const opposite = { top: "bottom", bottom: "top", left: "right", right: "left" }[side];
  const available = {
    top: anchor.top - bounds.top - viewportGap,
    bottom: bounds.bottom - anchor.bottom - viewportGap,
    left: anchor.left - bounds.left - viewportGap,
    right: bounds.right - anchor.right - viewportGap,
  };
  const needed = (side === "top" || side === "bottom" ? surfaceRect.height : surfaceRect.width) + gap;
  const actual = available[side] < needed && available[opposite] > available[side] ? opposite : side;
  surface.dataset.uiActualPlacement = actual;
  surface.dataset.uiActualAlign = align;
  const rtl = getComputedStyle(surface).direction === "rtl";
  let left;
  let top;
  if (actual === "top" || actual === "bottom") {
    top = actual === "top" ? anchor.top - surfaceRect.height - gap : anchor.bottom + gap;
    left = align === "start"
      ? (rtl ? anchor.right - surfaceRect.width : anchor.left)
      : align === "end"
        ? (rtl ? anchor.left : anchor.right - surfaceRect.width)
        : (anchor.left + anchor.right - surfaceRect.width) / 2;
  } else {
    left = actual === "left" ? anchor.left - surfaceRect.width - gap : anchor.right + gap;
    top = align === "start" ? anchor.top : align === "end" ? anchor.bottom - surfaceRect.height : (anchor.top + anchor.bottom - surfaceRect.height) / 2;
  }
  const shift = clamp({ left, top, right: left + surfaceRect.width, bottom: top + surfaceRect.height, width: surfaceRect.width, height: surfaceRect.height }, bounds, viewportGap);
  surface.style.left = `${Math.round(left + shift.x)}px`;
  surface.style.top = `${Math.round(top + shift.y)}px`;
  surface.style.right = "auto";
  surface.style.bottom = "auto";
}

export function createAnchoredSurface(surface, options = {}) {
  const owner = surface.ownerDocument.defaultView;
  let placement = options.placement ?? "bottom-start";
  const gap = () => Math.max(0, Number(typeof options.gap === "function" ? options.gap() : options.gap ?? 4) || 0);
  const viewportGap = Math.max(0, options.viewportGap ?? 8);
  let anchor = options.anchor ?? null;
  let point = null;
  let open = false;
  let frame = null;
  let anchorFrame = null;
  let lastAnchorRect = null;
  let abort = null;
  let sizeObserver = null;
  surface.setAttribute("popover", "manual");
  surface.style.position = "fixed";
  surface.style.margin = "0";
  const position = () => {
    frame = null;
    if (!open) return;
    if (point) {
      fallbackPosition(surface, { left: point.x, right: point.x, top: point.y, bottom: point.y, width: 0, height: 0 }, "bottom-start", gap(), viewportGap);
      return;
    }
    if (!anchor) return;
    lastAnchorRect = anchor.getBoundingClientRect();
    fallbackPosition(surface, lastAnchorRect, placement, gap(), viewportGap);
  };
  const schedule = () => {
    if (open && frame === null) frame = owner.requestAnimationFrame(position);
  };
  // Resize and scroll events do not report an ancestor's transition or layout shift.
  // While visible, sample the anchor and only re-position when its bounds change.
  const trackAnchor = () => {
    anchorFrame = null;
    if (!open || !anchor || point) return;
    const rect = anchor.getBoundingClientRect();
    if (!lastAnchorRect || rect.left !== lastAnchorRect.left || rect.top !== lastAnchorRect.top
      || rect.width !== lastAnchorRect.width || rect.height !== lastAnchorRect.height) schedule();
    anchorFrame = owner.requestAnimationFrame(trackAnchor);
  };
  const stopTracking = () => {
    if (anchorFrame !== null) owner.cancelAnimationFrame(anchorFrame);
    anchorFrame = null;
    lastAnchorRect = null;
  };
  const syncListeners = () => {
    if (open && anchor && !point) {
      if (anchorFrame === null) anchorFrame = owner.requestAnimationFrame(trackAnchor);
    } else stopTracking();
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
  return {
    setAnchor(next) { point = null; anchor = next; syncListeners(); schedule(); },
    setPlacement(next) { placement = next || "bottom-start"; schedule(); },
    show() { point = null; open = true; syncListeners(); show(surface); position(); schedule(); observeSize(); },
    showAtPoint(next) { point = next; open = true; syncListeners(); show(surface); position(); schedule(); observeSize(); },
    hide() { open = false; point = null; syncListeners(); stopSize(); if (frame !== null) owner.cancelAnimationFrame(frame); frame = null; hide(surface); },
    refresh: schedule,
    destroy() { open = false; stopTracking(); abort?.abort(); abort = null; stopSize(); if (frame !== null) owner.cancelAnimationFrame(frame); frame = null; hide(surface); anchor = null; },
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
