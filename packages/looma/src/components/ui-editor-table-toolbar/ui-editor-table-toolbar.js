import { closeOverlay, createViewportSurface, openOverlay, positionAnchoredSurface } from "../shared/overlay.js";
import { backgrounds } from "../shared/editor.js";

const overflowSections = [
  ["Structure", [["add-row-before", "Add row above", "panel-top"], ["add-column-before", "Add column left", "panel-left"], ["toggle-header-row", "Header row", "rows"], ["toggle-header-column", "Header column", "columns"], ["move-row-up", "Move row up", "rows"], ["move-row-down", "Move row down", "rows"], ["move-column-left", "Move column left", "columns"], ["move-column-right", "Move column right", "columns"]]],
  ["Cells", [["clear-cells", "Clear selected cells", "eraser"], ["merge-cells", "Merge selected cells", "merge"], ["split-cell", "Split merged cell", "split"]]],
  ["Table", [["delete-row", "Delete row", "trash", "danger"], ["delete-column", "Delete column", "trash", "danger"], ["delete-table", "Delete table", "trash", "danger"]]],
];

// Lists the actions the table selection permits; the overflow menu opens and closes here.
export default function controller(host) {
  const element = host.element;
  let alive = true;
  let menu = null;
  let surface = null;
  const document = element.ownerDocument;
  const positionMenu = () => {
    const button = element.querySelector(".more");
    if (!button || !menu) return;
    const rect = button.getBoundingClientRect();
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop ?? 0;
    const bottom = top + (viewport?.height ?? window.innerHeight);
    const above = rect.top - top - 20;
    const below = bottom - rect.bottom - 20;
    menu.style.maxHeight = `${Math.max(80, Math.floor(Math.max(above, below)))}px`;
    positionAnchoredSurface(menu, rect, { placement: "bottom-end", gap: 8, viewportGap: 12 });
  };
  const close = (reason) => {
    host.state.overflowOpen = false;
    if (reason === "escape") element.querySelector(".more")?.focus();
  };
  const releasePresentation = () => {
    surface?.destroy();
    surface = null;
    menu = null;
    closeOverlay(document, element);
  };
  const syncPresentation = () => {
    if (!alive || !host.state.overflowOpen) return;
    const next = element.querySelector(".menu");
    if (!next) return;
    if (next !== menu) {
      releasePresentation();
      menu = next;
      surface = createViewportSurface(menu, { position: positionMenu });
    }
    surface.show();
    openOverlay({ id: element, modal: false, element: menu, relatedElements: [element], dismissible: true, requestClose: close });
  };
  const stopPresentation = host.effect(() => {
    if (host.state.overflowOpen) queueMicrotask(syncPresentation);
    else releasePresentation();
  });
  const stop = host.effect(() => {
    const enabled = new Set(Array.isArray(host.props.actions.value) ? host.props.actions.value : []);
    const alignment = host.props.cellAlignment.value === "center" || host.props.cellAlignment.value === "right" ? host.props.cellAlignment.value : "left";
    host.state.alignments = [["align-left", "Align left"], ["align-center", "Align center"], ["align-right", "Align right"]]
      .filter(([action]) => enabled.has(action))
      .map(([action, label]) => ({ action, label, active: action === `align-${alignment}` }));
    host.state.structure = [["add-row-after", "Add row", "rows"], ["add-column-after", "Add column", "columns"]]
      .filter(([action]) => enabled.has(action))
      .map(([action, label, icon]) => ({ action, label, icon }));
    const background = String(host.props.cellBackground.value ?? "");
    host.state.swatches = backgrounds.filter(([action]) => enabled.has(action))
      .map(([action, label, color]) => ({ action, label, color, selected: color === background }));
    host.state.sections = overflowSections
      .map(([heading, items]) => ({
        heading,
        items: items.filter(([action]) => enabled.has(action))
          .map(([action, label, icon, tone]) => ({ action, label, icon, danger: tone === "danger", checkable: action.startsWith("toggle-header-"), checked: action === "toggle-header-row" ? Boolean(host.props.headerRow.value) : action === "toggle-header-column" ? Boolean(host.props.headerColumn.value) : false })),
      }))
      .filter((section) => section.items.length);
    host.state.hasOverflow = host.state.swatches.length > 0 || host.state.sections.length > 0;
    if (!host.props.open.value || !host.state.hasOverflow) host.state.overflowOpen = false;
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
  element.addEventListener("click", onClick);
  return () => {
    alive = false;
    stop();
    stopPresentation();
    releasePresentation();
    element.removeEventListener("click", onClick);
  };
}
