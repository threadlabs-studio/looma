import { icon } from "./shared/editor.js";

function bounded(value, fallback) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(1, parsed)) : fallback;
}
function fallbackBoundaries(segments, length) {
  return Array.from({ length: segments + 1 }, (_, index) => (index * length) / segments);
}
function numbers(value) {
  const values = Array.isArray(value)
    ? value.map(Number)
    : typeof value === "string" ? value.split(/[\s,]+/).filter(Boolean).map(Number) : [];
  return values.every(Number.isFinite) ? values : [];
}
function cellFrom(value) {
  const values = numbers(value);
  if (values.length !== 6) return null;
  const [left, top, width, height, rowIndex, columnIndex] = values;
  return { left, top, width, height, rowIndex, columnIndex };
}
function createProximity(scope, selector = ".ui-editor-table-overlay__handle[data-ui-affordance]", radius = 16) {
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
  const element = host.element; let activeControlKey = null;
  const proximity = createProximity(element);
  const boundaries = (axis, segments) => {
    const geometry = host.state.geometry;
    const values = geometry?.[axis === "row" ? "rowBoundaries" : "columnBoundaries"]
      ?? host.state[axis === "row" ? "rowBoundaries" : "columnBoundaries"];
    const parsed = numbers(values);
    if (parsed.length === segments + 1) return parsed;
    const rect = element.getBoundingClientRect(); return fallbackBoundaries(segments, axis === "row" ? rect.height : rect.width);
  };
  const insertion = (axis, index, position) => {
    const first = index === 0; const noun = axis === "row" ? "row" : "column";
    const action = axis === "row" ? (first ? "add-row-before" : "add-row-after") : (first ? "add-column-before" : "add-column-after");
    const relation = first ? (axis === "row" ? "above" : "left") : (axis === "row" ? "below" : "right");
    const label = `Insert ${noun} ${relation}`; const key = `${axis}:${index}`;
    return `<div class="ui-editor-table-overlay__control ui-editor-table-overlay__control--${axis}" style="${axis === "row" ? "top" : "left"}:${position}px" data-control-key="${key}" data-active="${activeControlKey === key}"><span class="ui-editor-table-overlay__line" aria-hidden="true"></span><span class="ui-editor-table-overlay__guide" data-ui-guide aria-hidden="true"></span><button type="button" class="ui-editor-table-overlay__handle" data-ui-affordance="insert-${noun}" data-action="${action}" data-boundary-index="${index}" aria-label="${label}">${icon("plus")}<span class="ui-editor-table-overlay__tooltip" role="tooltip">${label}</span></button></div>`;
  };
  const selectors = (cell) => {
    const indexes = `data-row-index="${cell.rowIndex}" data-column-index="${cell.columnIndex}"`;
    return `<button type="button" class="ui-editor-table-overlay__selector ui-editor-table-overlay__selector--row" style="top:${cell.top + cell.height / 2}px" data-action="select-row" ${indexes} title="Select row" aria-label="Select row">${icon("grip-vertical")}</button><button type="button" class="ui-editor-table-overlay__selector ui-editor-table-overlay__selector--column" style="left:${cell.left + cell.width / 2}px" data-action="select-column" ${indexes} title="Select column" aria-label="Select column">${icon("grip-horizontal")}</button>`;
  };
  const menu = (cell) => `<button type="button" class="ui-editor-table-overlay__cell-menu" style="left:${cell.left + cell.width - 30}px;top:${cell.top + 6}px" data-action="open-cell-menu" data-row-index="${cell.rowIndex}" data-column-index="${cell.columnIndex}" title="Cell actions" aria-label="Cell actions">${icon("chevron-down")}</button>`;
  const render = () => {
    element.hidden = !host.state.open; if (!host.state.open) { activeControlKey = null; return; }
    const rows = bounded(host.state.rows, 3); const cols = bounded(host.state.cols, 3);
    const rowBoundaries = boundaries("row", rows); const columnBoundaries = boundaries("column", cols);
    const geometry = host.state.geometry;
    const active = geometry?.activeCell ?? cellFrom(host.state.activeCell);
    const hovered = geometry?.hoveredCell ?? cellFrom(host.state.hoveredCell);
    element.innerHTML = `<div class="ui-editor-table-overlay" aria-label="Table controls"><div class="ui-editor-table-overlay__rows">${rowBoundaries.map((position, index) => insertion("row", index, position)).join("")}</div><div class="ui-editor-table-overlay__cols">${columnBoundaries.map((position, index) => insertion("col", index, position)).join("")}</div>${hovered ? selectors(hovered) : ""}${active ? menu(active) : ""}</div>`;
    proximity.refresh();
  };
  const setActive = (key) => {
    if (activeControlKey === key) return; activeControlKey = key;
    for (const control of element.querySelectorAll("[data-control-key]")) control.dataset.active = String(control.dataset.controlKey === key);
  };
  const onClick = (event) => {
    const button = event.target.closest?.("button[data-action]"); if (!button) return;
    const action = button.dataset.action;
    if (action === "select-row" || action === "select-column") {
      host.dispatch("looma-editor-table-overlay-action", { action, rowIndex: Number(button.dataset.rowIndex), columnIndex: Number(button.dataset.columnIndex) }); return;
    }
    if (action === "open-cell-menu") {
      const rect = button.getBoundingClientRect(); host.dispatch("looma-editor-table-overlay-action", { action, rowIndex: Number(button.dataset.rowIndex), columnIndex: Number(button.dataset.columnIndex), anchor: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } }); return;
    }
    host.dispatch("looma-editor-table-overlay-action", { action, boundaryIndex: Number(button.dataset.boundaryIndex) });
  };
  const enter = (event) => setActive(event.target.closest?.("[data-control-key]")?.dataset.controlKey ?? null);
  const leave = (event) => setActive(event.relatedTarget instanceof Element ? event.relatedTarget.closest?.("[data-control-key]")?.dataset.controlKey ?? null : null);
  element.addEventListener("click", onClick); element.addEventListener("pointerover", enter); element.addEventListener("pointerout", leave); element.addEventListener("focusin", enter); element.addEventListener("focusout", leave);
  const stop = host.effect(render); render();
  return () => { stop(); proximity.destroy(); element.removeEventListener("click", onClick); element.removeEventListener("pointerover", enter); element.removeEventListener("pointerout", leave); element.removeEventListener("focusin", enter); element.removeEventListener("focusout", leave); };
}
