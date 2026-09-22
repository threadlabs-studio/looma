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
  owner.addEventListener("resize", refresh, { passive: true });
  owner.addEventListener("scroll", refresh, { passive: true, capture: true });
  owner.visualViewport?.addEventListener("resize", refresh, { passive: true });
  owner.visualViewport?.addEventListener("scroll", refresh, { passive: true });
  measure();
  return { refresh, destroy() {
    pointerTarget.removeEventListener("pointermove", onPointermove);
    owner.removeEventListener("resize", refresh); owner.removeEventListener("scroll", refresh, true);
    owner.visualViewport?.removeEventListener("resize", refresh); owner.visualViewport?.removeEventListener("scroll", refresh);
    if (frame !== null) owner.cancelAnimationFrame(frame); clear();
  } };
}

export default function controller(host) {
  const element = host.element;
  const proximity = createProximity(element);
  const boundaries = (axis) => {
    const values = host.state.geometry?.[axis === "row" ? "rowBoundaries" : "columnBoundaries"];
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
    if (!host.state.open) {
      host.state.activeKey = "";
      return;
    }
    host.state.rows = controls("row");
    host.state.cols = controls("col");
    const hovered = host.state.geometry?.hoveredCell ?? null;
    host.state.hovered = hovered && {
      ...hovered,
      rowOffset: `${hovered.top + hovered.height / 2}px`,
      columnOffset: `${hovered.left + hovered.width / 2}px`,
    };
    const active = host.state.geometry?.activeCell ?? null;
    host.state.active = active && { ...active, menuLeft: `${active.left + active.width - 30}px`, menuTop: `${active.top + 6}px` };
    queueMicrotask(proximity.refresh);
  });
  const onClick = (event) => {
    const button = event.target.closest?.("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const cell = { rowIndex: Number(button.dataset.rowIndex), columnIndex: Number(button.dataset.columnIndex) };
    if (action === "select-row" || action === "select-column") host.dispatch("action", { action, ...cell });
    else if (action === "open-cell-menu") {
      const rect = button.getBoundingClientRect();
      host.dispatch("action", { action, ...cell, anchor: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } });
    } else host.dispatch("action", { action, boundaryIndex: Number(button.dataset.boundaryIndex) });
  };
  const keyOf = (target) => target instanceof Element ? target.closest("[data-control-key]")?.dataset.controlKey ?? "" : "";
  const enter = (event) => { host.state.activeKey = keyOf(event.target); };
  const leave = (event) => { host.state.activeKey = keyOf(event.relatedTarget); };
  element.addEventListener("click", onClick);
  element.addEventListener("pointerover", enter);
  element.addEventListener("pointerout", leave);
  element.addEventListener("focusin", enter);
  element.addEventListener("focusout", leave);
  return () => {
    stop();
    proximity.destroy();
    element.removeEventListener("click", onClick);
    element.removeEventListener("pointerover", enter);
    element.removeEventListener("pointerout", leave);
    element.removeEventListener("focusin", enter);
    element.removeEventListener("focusout", leave);
  };
}
