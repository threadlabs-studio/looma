import { backgrounds } from "../shared/editor.js";

const overflowSections = [
  ["Structure", [["add-row-before", "Add row above", "panel-top"], ["add-column-before", "Add column left", "panel-left"]]],
  ["Cells", [["clear-cells", "Clear selected cells", "eraser"], ["merge-cells", "Merge selected cells", "merge"], ["split-cell", "Split merged cell", "split"]]],
  ["Table", [["delete-row", "Delete row", "trash", "danger"], ["delete-column", "Delete column", "trash", "danger"], ["delete-table", "Delete table", "trash", "danger"]]],
];

// Lists the actions the table selection permits; the overflow menu opens and closes here.
export default function controller(host) {
  const element = host.element;
  const stop = host.effect(() => {
    const enabled = new Set(Array.isArray(host.state.actions) ? host.state.actions : []);
    const alignment = host.state.cellAlignment === "center" || host.state.cellAlignment === "right" ? host.state.cellAlignment : "left";
    host.state.alignments = [["align-left", "Align left"], ["align-center", "Align center"], ["align-right", "Align right"]]
      .filter(([action]) => enabled.has(action))
      .map(([action, label]) => ({ action, label, active: action === `align-${alignment}` }));
    host.state.structure = [["add-row-after", "Add row", "rows"], ["add-column-after", "Add column", "columns"]]
      .filter(([action]) => enabled.has(action))
      .map(([action, label, icon]) => ({ action, label, icon }));
    const background = String(host.state.cellBackground ?? "");
    host.state.swatches = backgrounds.filter(([action]) => enabled.has(action))
      .map(([action, label, color]) => ({ action, label, color, selected: color === background }));
    host.state.sections = overflowSections
      .map(([heading, items]) => ({
        heading,
        items: items.filter(([action]) => enabled.has(action))
          .map(([action, label, icon, tone]) => ({ action, label, icon, danger: tone === "danger" })),
      }))
      .filter((section) => section.items.length);
    host.state.hasOverflow = host.state.swatches.length > 0 || host.state.sections.length > 0;
    if (!host.state.open || !host.state.hasOverflow) host.state.overflowOpen = false;
  });
  const onClick = (event) => {
    const action = event.target.closest?.("[data-action]")?.dataset.action;
    if (!action) return;
    if (action === "toggle-overflow") {
      host.state.overflowOpen = !host.state.overflowOpen;
      return;
    }
    host.state.overflowOpen = false;
    host.dispatch("action", { action });
  };
  const onOutside = (event) => {
    if (host.state.overflowOpen && !event.composedPath().includes(element)) host.state.overflowOpen = false;
  };
  element.addEventListener("click", onClick);
  document.addEventListener("pointerdown", onOutside, true);
  return () => {
    stop();
    element.removeEventListener("click", onClick);
    document.removeEventListener("pointerdown", onOutside, true);
  };
}
