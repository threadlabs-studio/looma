import { createViewportSurface, writtenPlace } from "../shared/overlay.js";
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

// Shows the menu at the place it is written, keeping one in a floating box inside the viewport, and lists
// the actions the selection permits.
function connect(host) {
  const element = host.element;
  let place = null;
  const nudge = () => {
    element.style.translate = "";
    if (!place) return;
    const rect = element.getBoundingClientRect();
    const at = place.rect();
    let x = at.left - rect.left;
    let y = at.top - rect.top;
    // Only a menu in a fixed or absolutely positioned box, as LoomaEditor places it, answers to the
    // viewport; one in page flow travels with its place.
    if (place.floating) {
      const view = viewport();
      const inset = 12;
      const left = rect.left + x;
      const top = rect.top + y;
      if (left < view.left + inset) x += view.left + inset - left;
      else if (left + rect.width > view.right - inset) x += view.right - inset - left - rect.width;
      if (top < view.top + inset) y += view.top + inset - top;
      else if (top + rect.height > view.bottom - inset) y += view.bottom - inset - top - rect.height;
    }
    if (x || y) element.style.translate = `${x}px ${y}px`;
  };
  const surface = createViewportSurface(element, { position: nudge });
  const show = () => {
    if (!element.matches(":popover-open")) place = writtenPlace(element, ["translate"]);
    surface.show();
  };
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
    if (host.props.open.value) queueMicrotask(() => { if (host.props.open.value) show(); });
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
