import { backgrounds, viewport } from "../shared/editor.js";

const sections = [
  ["Structure", [
    ["add-row-before", "Add row above", "panel-top"],
    ["add-row-after", "Add row below", "panel-bottom"],
    ["add-column-before", "Add column left", "panel-left"],
    ["add-column-after", "Add column right", "panel-right"],
  ]],
  ["Cells", [
    ["clear-cells", "Clear selected cells", "eraser"],
    ["merge-cells", "Merge cells", "merge"],
    ["split-cell", "Split cell", "split"],
  ]],
  ["Table", [
    ["delete-row", "Delete row", "trash", "danger"],
    ["delete-column", "Delete column", "trash", "danger"],
    ["delete-table", "Delete table", "trash", "danger"],
  ]],
];

// Lists the actions the selection permits, and nudges the open menu back inside the viewport.
export default function controller(host) {
  const element = host.element;
  let frame;
  const nudge = () => {
    frame = undefined;
    element.style.translate = "";
    const rect = element.getBoundingClientRect();
    const view = viewport();
    const inset = 12;
    let x = 0;
    let y = 0;
    if (rect.left < view.left + inset) x = view.left + inset - rect.left;
    else if (rect.right > view.right - inset) x = view.right - inset - rect.right;
    if (rect.top < view.top + inset) y = view.top + inset - rect.top;
    else if (rect.bottom > view.bottom - inset) y = view.bottom - inset - rect.bottom;
    if (x || y) element.style.translate = `${x}px ${y}px`;
  };
  const schedule = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(nudge);
  };
  const stop = host.effect(() => {
    const enabled = new Set(Array.isArray(host.state.actions) ? host.state.actions : []);
    const background = String(host.state.cellBackground ?? "");
    const swatches = backgrounds.filter(([action]) => enabled.has(action))
      .map(([action, label, color]) => ({ action, label, color, selected: color === background }));
    host.state.swatches = swatches.length ? swatches : null;
    host.state.sections = sections
      .map(([heading, items]) => ({
        heading,
        items: items.filter(([action]) => enabled.has(action))
          .map(([action, label, icon, tone]) => ({ action, label, icon, danger: tone === "danger" })),
      }))
      .filter((section) => section.items.length);
    if (host.state.open) schedule();
  });
  const onClick = (event) => {
    const action = event.target.closest?.("[data-action]")?.dataset.action;
    if (action) host.dispatch("action", { action });
  };
  element.addEventListener("click", onClick);
  window.addEventListener("resize", schedule);
  window.visualViewport?.addEventListener("resize", schedule);
  window.visualViewport?.addEventListener("scroll", schedule);
  return () => {
    stop();
    element.removeEventListener("click", onClick);
    window.removeEventListener("resize", schedule);
    window.visualViewport?.removeEventListener("resize", schedule);
    window.visualViewport?.removeEventListener("scroll", schedule);
    if (frame) cancelAnimationFrame(frame);
  };
}
