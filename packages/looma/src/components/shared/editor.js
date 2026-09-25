export const backgrounds = [
  ["background-none", "Default", ""], ["background-gray", "Gray", "#f3f4f6"],
  ["background-yellow", "Yellow", "#fef3c7"], ["background-blue", "Blue", "#dbeafe"],
  ["background-green", "Green", "#dcfce7"], ["background-red", "Red", "#fee2e2"],
];

// Looma's icon set as plain data, generated from LOOMA_ICONS (see shared/icons.js).
export { icons } from "./icons.js";

export function normalizeAnchor(value) {
  if (!value || typeof value !== "object") return null;
  const finite = (candidate) => typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null;
  const x = finite(value.x); const y = finite(value.y); const width = finite(value.width); const height = finite(value.height);
  const left = finite(value.left) ?? x; const top = finite(value.top) ?? y;
  const right = finite(value.right) ?? (left !== null && width !== null ? left + width : null);
  const bottom = finite(value.bottom) ?? (top !== null && height !== null ? top + height : null);
  return left === null || top === null || right === null || bottom === null ? null : { left, top, right, bottom };
}

export function viewport() {
  const visual = window.visualViewport;
  const left = visual?.offsetLeft ?? 0; const top = visual?.offsetTop ?? 0;
  const width = visual?.width ?? window.innerWidth; const height = visual?.height ?? window.innerHeight;
  return { left, top, width, height, right: left + width, bottom: top + height };
}

/**
 * Places a floating menu below its anchor (or above, when there is more room), or as a bottom sheet on
 * narrow screens.
 */
export function positionMenu(element, rect, width) {
  if (!rect) return;
  const view = viewport();
  Object.assign(element.style, { position: "fixed", zIndex: "500" });
  if (window.innerWidth < 768) {
    const height = Math.min(320, Math.max(0, view.height - 56));
    Object.assign(element.style, { left: `${view.left}px`, right: "", bottom: "", top: `${view.top + view.height - height - 56}px`, width: `${view.width}px`, maxHeight: `${height}px` });
    return;
  }
  const below = view.bottom - rect.bottom - 8;
  const above = rect.top - view.top - 8;
  const top = below >= 320 || below >= above ? rect.bottom + 8 : rect.top - 328;
  const left = Math.max(view.left + 8, Math.min(rect.left, view.right - width - 8));
  Object.assign(element.style, { top: `${Math.max(view.top + 8, top)}px`, left: `${left}px`, right: "", bottom: "", width: `${width}px`, maxHeight: "" });
}
