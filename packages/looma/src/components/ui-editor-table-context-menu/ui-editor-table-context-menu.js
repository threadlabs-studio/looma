import { createViewportSurface } from "../shared/overlay.js";
import { backgrounds, viewport } from "../shared/editor.js";

const sections = [
  ["Structure", [
    ["add-row-before", "Add row above", "panel-top"],
    ["add-row-after", "Add row below", "panel-bottom"],
    ["add-column-before", "Add column left", "panel-left"],
    ["add-column-after", "Add column right", "panel-right"],
    ["toggle-header-row", "Header row", "rows"],
    ["toggle-header-column", "Header column", "columns"],
    ["move-row-up", "Move row up", "rows"],
    ["move-row-down", "Move row down", "rows"],
    ["move-column-left", "Move column left", "columns"],
    ["move-column-right", "Move column right", "columns"],
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
function connect(host) {
  const element = host.element;
  const nudge = () => {
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
  const surface = createViewportSurface(element, { position: nudge });
  const stop = host.effect(() => {
    const scope = String(host.props.scope.value || "cell");
    const enabled = new Set((Array.isArray(host.props.actions.value) ? host.props.actions.value : []).filter((action) =>
      scope === "cell" || (scope === "row" ? !action.includes("column") : !action.includes("row"))));
    const background = String(host.props.cellBackground.value ?? "");
    const swatches = backgrounds.filter(([action]) => enabled.has(action))
      .map(([action, label, color]) => ({ action, label, color, selected: color === background }));
    host.state.swatches = swatches.length ? swatches : null;
    host.state.sections = sections
      .map(([heading, items]) => ({
        heading,
        items: items.filter(([action]) => enabled.has(action))
          .map(([action, label, icon, tone]) => ({ action, label, icon, danger: tone === "danger", checkable: action.startsWith("toggle-header-"), checked: action === "toggle-header-row" ? Boolean(host.props.headerRow.value) : action === "toggle-header-column" ? Boolean(host.props.headerColumn.value) : false })),
      }))
      .filter((section) => section.items.length);
    if (host.props.open.value) queueMicrotask(() => { if (host.props.open.value) surface.show(); });
    else surface.hide();
  });
  const onClick = (event) => {
    const action = event.target.closest?.("[data-action]")?.dataset.action;
    if (action) host.dispatch("action", { action });
  };
  element.addEventListener("click", onClick);
  return () => {
    stop();
    surface.destroy();
    element.removeEventListener("click", onClick);
  };
}

/** Keep DOM setup and its cleanup tied to each connection, including reconnects. */
export default function controller(host) {
  host.on("connect", () => connect(host));
}
