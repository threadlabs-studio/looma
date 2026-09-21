export const backgrounds = [
  ["background-none", "Default", ""], ["background-gray", "Gray", "#f3f4f6"],
  ["background-yellow", "Yellow", "#fef3c7"], ["background-blue", "Blue", "#dbeafe"],
  ["background-green", "Green", "#dcfce7"], ["background-red", "Red", "#fee2e2"],
];

export function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

// Serialized from Looma's framework-neutral icon catalog. Keeping the icon nodes here lets the
// migration controllers stay directly importable in a browser without introducing a bundler-only
// package resolution step.
const icons = {
  "align-left": [["path", { d: "M21 5H3" }], ["path", { d: "M15 12H3" }], ["path", { d: "M17 19H3" }]],
  "align-center": [["path", { d: "M21 5H3" }], ["path", { d: "M17 12H7" }], ["path", { d: "M19 19H5" }]],
  "align-right": [["path", { d: "M21 5H3" }], ["path", { d: "M21 12H9" }], ["path", { d: "M21 19H7" }]],
  rows: [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M21 9H3" }], ["path", { d: "M21 15H3" }]],
  columns: [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M9 3v18" }], ["path", { d: "M15 3v18" }]],
  table: [["path", { d: "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" }]],
  "chevron-down": [["path", { d: "m6 9 6 6 6-6" }]],
  "panel-top": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M3 9h18" }]],
  "panel-bottom": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M3 15h18" }]],
  "panel-left": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M9 3v18" }]],
  "panel-right": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M15 3v18" }]],
  eraser: [["path", { d: "M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21" }], ["path", { d: "m5.082 11.09 8.828 8.828" }]],
  merge: [["path", { d: "m8 6 4-4 4 4" }], ["path", { d: "M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22" }], ["path", { d: "m20 22-5-5" }]],
  split: [["path", { d: "M16 3h5v5" }], ["path", { d: "M8 3H3v5" }], ["path", { d: "M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" }], ["path", { d: "m15 9 6-6" }]],
  trash: [["path", { d: "M10 11v6" }], ["path", { d: "M14 11v6" }], ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }], ["path", { d: "M3 6h18" }], ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }]],
  plus: [["path", { d: "M5 12h14" }], ["path", { d: "M12 5v14" }]],
  "grip-vertical": [["circle", { cx: "9", cy: "12", r: "1" }], ["circle", { cx: "9", cy: "5", r: "1" }], ["circle", { cx: "9", cy: "19", r: "1" }], ["circle", { cx: "15", cy: "12", r: "1" }], ["circle", { cx: "15", cy: "5", r: "1" }], ["circle", { cx: "15", cy: "19", r: "1" }]],
  "grip-horizontal": [["circle", { cx: "12", cy: "9", r: "1" }], ["circle", { cx: "19", cy: "9", r: "1" }], ["circle", { cx: "5", cy: "9", r: "1" }], ["circle", { cx: "12", cy: "15", r: "1" }], ["circle", { cx: "19", cy: "15", r: "1" }], ["circle", { cx: "5", cy: "15", r: "1" }]],
  "heading-1": [["path", { d: "M4 12h8" }], ["path", { d: "M4 18V6" }], ["path", { d: "M12 18V6" }], ["path", { d: "m17 12 3-2v8" }]],
  pilcrow: [["path", { d: "M13 4v16" }], ["path", { d: "M17 4v16" }], ["path", { d: "M19 4H9.5a4.5 4.5 0 0 0 0 9H13" }]],
  quote: [["path", { d: "M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" }], ["path", { d: "M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" }]],
};

export function icon(name, className = "looma-icon") {
  const nodes = (icons[name] ?? []).map(([tag, attributes]) => {
    const serialized = Object.entries(attributes).map(([key, value]) => ` ${key}="${value}"`).join("");
    return `<${tag}${serialized}></${tag}>`;
  }).join("");
  return `<svg class="${className}" data-looma-icon="${name}" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${nodes}</svg>`;
}

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
