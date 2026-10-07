import { observeOverlayViewport } from "../shared/overlay.js";

function fallbackBoundaries(segments, length) {
  return Array.from({ length: segments + 1 }, (_, index) => (index * length) / segments);
}
function createProximity(scope, selector = ".handle[data-ui-affordance]", radius = 16) {
  const owner = scope.ownerDocument.defaultView; const pointerTarget = scope.ownerDocument;
  let anchors = []; let frame = null; let point = null; let dirty = false;
  const distance = (position, rect) => Math.hypot(
    Math.max(rect.left - position.x, 0, position.x - rect.right),
    Math.max(rect.top - position.y, 0, position.y - rect.bottom),
  );
  const clear = () => {
    for (const anchor of anchors) anchor.element.removeAttribute("data-ui-proximity");
    scope.removeAttribute("data-ui-interaction");
  };
  const measure = () => {
    anchors = Array.from(scope.querySelectorAll(selector))
      .filter((element) => !element.disabled && element.getAttribute("aria-disabled") !== "true")
      .map((element) => ({ element, rect: element.getBoundingClientRect() }));
    dirty = false;
  };
  const update = () => {
    frame = null; if (dirty) measure(); if (!point) { clear(); return; }
    let engaged = false;
    for (const anchor of anchors) {
      const near = distance(point, anchor.rect) <= radius;
      if (near) anchor.element.setAttribute("data-ui-proximity", "near");
      else anchor.element.removeAttribute("data-ui-proximity");
      engaged ||= near;
    }
    if (engaged) scope.setAttribute("data-ui-interaction", "engaged");
    else scope.removeAttribute("data-ui-interaction");
  };
  const schedule = () => { if (frame === null) frame = owner.requestAnimationFrame(update); };
  const refresh = () => { dirty = true; schedule(); };
  const onPointermove = (event) => {
    point = event.pointerType === "touch" ? null : { x: event.clientX, y: event.clientY }; schedule();
  };
  pointerTarget.addEventListener("pointermove", onPointermove, { passive: true });
  const stopViewport = observeOverlayViewport(scope.ownerDocument, refresh);
  measure();
  return { refresh, destroy() {
    pointerTarget.removeEventListener("pointermove", onPointermove);
    stopViewport();
    if (frame !== null) owner.cancelAnimationFrame(frame); clear();
  } };
}

function connect(host) {
  const element = host.element;
  const proximity = createProximity(element);
  let drag = null;
  let suppressClick = false;
  const indicator = () => element.querySelector("[data-drop-indicator]");
  const clearDrag = () => {
    drag = null;
    const guide = indicator();
    if (guide) {
      guide.hidden = true;
      guide.classList.remove("row", "column");
    }
  };
  const onPointerDown = (event) => {
    const button = event.target.closest?.("button.selector[data-action]");
    if (!button || event.button !== 0) return;
    const axis = button.dataset.action === "select-row" ? "row" : "column";
    drag = { pointerId: event.pointerId, axis, from: Number(button.dataset[axis === "row" ? "rowIndex" : "columnIndex"]), x: event.clientX, y: event.clientY, to: null };
    button.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const onPointerMove = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5 && drag.to === null) return;
    const rect = element.getBoundingClientRect();
    const values = boundaries(drag.axis);
    const coordinate = drag.axis === "row" ? event.clientY - rect.top : event.clientX - rect.left;
    const found = values.findIndex((_, index) => index < values.length - 1 && coordinate < values[index + 1]);
    const to = found < 0 ? values.length - 2 : found;
    drag.to = to;
    const guide = indicator();
    if (!guide) return;
    guide.hidden = false;
    guide.classList.toggle("row", drag.axis === "row");
    guide.classList.toggle("column", drag.axis === "column");
    const boundary = to > drag.from ? values[to + 1] : values[to];
    if (drag.axis === "row") guide.style.top = `${boundary}px`;
    else guide.style.left = `${boundary}px`;
  };
  const onPointerUp = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const { axis, from, to } = drag;
    clearDrag();
    if (to === null) return;
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    if (to !== from) host.dispatch(axis === "row" ? "reorder-row" : "reorder-column", { fromIndex: from, toIndex: to });
  };
  const boundaries = (axis) => {
    const values = host.props.geometry.value?.[axis === "row" ? "rowBoundaries" : "columnBoundaries"];
    if (Array.isArray(values) && values.length >= 2 && values.every(Number.isFinite)) return values;
    const rect = element.getBoundingClientRect();
    return fallbackBoundaries(3, axis === "row" ? rect.height : rect.width);
  };
  const controls = (axis) => boundaries(axis).map((position, index) => {
    const first = index === 0;
    const noun = axis === "row" ? "row" : "column";
    const relation = first ? (axis === "row" ? "above" : "left") : (axis === "row" ? "below" : "right");
    return {
      key: `${axis}:${index}`,
      index,
      offset: `${position}px`,
      affordance: `insert-${noun}`,
      action: `add-${noun}-${first ? "before" : "after"}`,
      label: `Insert ${noun} ${relation}`,
    };
  });
  const stop = host.effect(() => {
    if (!host.props.open.value) {
      host.state.activeKey = "";
      return;
    }
    host.state.rows = controls("row");
    host.state.cols = controls("col");
    const hovered = host.props.geometry.value?.hoveredCell ?? null;
    host.state.hovered = hovered && {
      ...hovered,
      rowOffset: `${hovered.top + hovered.height / 2}px`,
      columnOffset: `${hovered.left + hovered.width / 2}px`,
    };
    const active = host.props.geometry.value?.activeCell ?? null;
    host.state.active = active && { ...active, menuLeft: `${active.left + active.width - 30}px`, menuTop: `${active.top + 6}px` };
    queueMicrotask(proximity.refresh);
  });
  const onClick = (event) => {
    if (suppressClick) { event.preventDefault(); return; }
    const button = event.target.closest?.("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const cell = { rowIndex: Number(button.dataset.rowIndex), columnIndex: Number(button.dataset.columnIndex) };
    if (action === "select-row" || action === "select-column") {
      host.dispatch(action, cell);
      const rect = button.getBoundingClientRect();
      host.dispatch(action === "select-row" ? "open-row-menu" : "open-column-menu", { ...cell, anchor: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } });
    } else if (action === "open-cell-menu") {
      const rect = button.getBoundingClientRect();
      host.dispatch(action, { ...cell, anchor: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } });
    } else host.dispatch(action, { boundaryIndex: Number(button.dataset.boundaryIndex) });
  };
  const keyOf = (target) => target instanceof Element ? target.closest("[data-control-key]")?.dataset.controlKey ?? "" : "";
  const enter = (event) => { host.state.activeKey = keyOf(event.target); };
  const leave = (event) => { host.state.activeKey = keyOf(event.relatedTarget); };
  element.addEventListener("click", onClick);
  element.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("pointermove", onPointerMove, true);
  document.addEventListener("pointerup", onPointerUp, true);
  document.addEventListener("pointercancel", clearDrag, true);
  element.addEventListener("pointerover", enter);
  element.addEventListener("pointerout", leave);
  element.addEventListener("focusin", enter);
  element.addEventListener("focusout", leave);
  return () => {
    stop();
    proximity.destroy();
    element.removeEventListener("click", onClick);
    element.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("pointermove", onPointerMove, true);
    document.removeEventListener("pointerup", onPointerUp, true);
    document.removeEventListener("pointercancel", clearDrag, true);
    element.removeEventListener("pointerover", enter);
    element.removeEventListener("pointerout", leave);
    element.removeEventListener("focusin", enter);
    element.removeEventListener("focusout", leave);
  };
}

/** Keep DOM setup and its cleanup tied to each connection, including reconnects. */
export default function controller(host) {
  host.on("connect", () => connect(host));
}
