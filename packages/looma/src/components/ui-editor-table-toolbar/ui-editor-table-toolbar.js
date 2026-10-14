import { backgrounds, normalizeCellBackground } from "../shared/editor.js";
import { createAnchoredSurface } from "../shared/overlay.js";

const overflowSections = [
  ["Structure", [["add-row-before", "Add row above", "panel-top"], ["add-column-before", "Add column left", "panel-left"], ["toggle-header-row", "Header row", "rows"], ["toggle-header-column", "Header column", "columns"], ["move-row-up", "Move row up", "rows"], ["move-row-down", "Move row down", "rows"], ["move-column-left", "Move column left", "columns"], ["move-column-right", "Move column right", "columns"]]],
  ["Cells", [["clear-cells", "Clear selected cells", "eraser"], ["merge-cells", "Merge selected cells", "merge"], ["split-cell", "Split merged cell", "split"]]],
  ["Table", [["delete-row", "Delete row", "trash", "danger"], ["delete-column", "Delete column", "trash", "danger"], ["delete-table", "Delete table", "trash", "danger"]]],
];

// Lists the actions the table selection permits; the overflow menu opens and closes here.
function connect(host) {
  const element = host.element;
  let surface = null;
  let surfaceMenu = null;
  let positionFrame = null;
  const positionMenu = () => {
    if (!host.state.overflowOpen) return;
    const button = element.querySelector(".more");
    const menu = element.querySelector(".menu");
    if (!button || !menu) return;
    if (surfaceMenu !== menu) {
      surface?.destroy();
      surfaceMenu = menu;
      surface = createAnchoredSurface(menu, { anchor: button, placement: "bottom-end", gap: 8, viewportGap: 12 });
    }
    const rect = button.getBoundingClientRect();
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop ?? 0;
    const bottom = top + (viewport?.height ?? window.innerHeight);
    const above = rect.top - top - 20;
    const below = bottom - rect.bottom - 20;
    menu.style.maxHeight = `${Math.max(80, Math.floor(Math.max(above, below)))}px`;
    surface.show();
  };
  const schedulePosition = () => {
    if (positionFrame !== null) cancelAnimationFrame(positionFrame);
    positionFrame = requestAnimationFrame(() => { positionFrame = null; positionMenu(); });
  };
  const stop = host.effect(() => {
    const enabled = new Set(Array.isArray(host.props.actions.value) ? host.props.actions.value : []);
    const alignment = host.props.cellAlignment.value === "center" || host.props.cellAlignment.value === "right" ? host.props.cellAlignment.value : "left";
    host.state.alignments = [["align-left", "Align left"], ["align-center", "Align center"], ["align-right", "Align right"]]
      .filter(([action]) => enabled.has(action))
      .map(([action, label]) => ({ action, label, active: action === `align-${alignment}` }));
    host.state.structure = [["add-row-after", "Add row", "rows"], ["add-column-after", "Add column", "columns"]]
      .filter(([action]) => enabled.has(action))
      .map(([action, label, icon]) => ({ action, label, icon }));
    const background = normalizeCellBackground(host.props.cellBackground.value, host.element.ownerDocument);
    host.state.swatches = backgrounds.filter(([action]) => enabled.has(action))
      .map(([action, label, color]) => ({ action, label, color, selected: normalizeCellBackground(color, host.element.ownerDocument) === background }));
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
  const stopMenu = host.effect(() => {
    if (host.state.overflowOpen) schedulePosition();
    else {
      surface?.destroy();
      surface = null;
      surfaceMenu = null;
    }
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
  const onKeydown = (event) => {
    if (event.key === "Escape" && host.state.overflowOpen) {
      host.state.overflowOpen = false;
      event.preventDefault();
      event.stopPropagation();
      element.querySelector(".more")?.focus();
    }
  };
  element.addEventListener("click", onClick);
  document.addEventListener("pointerdown", onOutside, true);
  document.addEventListener("keydown", onKeydown, true);
  window.addEventListener("resize", positionMenu);
  window.visualViewport?.addEventListener("resize", positionMenu);
  return () => {
    stop();
    stopMenu();
    surface?.destroy();
    if (positionFrame !== null) cancelAnimationFrame(positionFrame);
    element.removeEventListener("click", onClick);
    document.removeEventListener("pointerdown", onOutside, true);
    document.removeEventListener("keydown", onKeydown, true);
    window.removeEventListener("resize", positionMenu);
    window.visualViewport?.removeEventListener("resize", positionMenu);
  };
}

/** Keep DOM setup and its cleanup tied to each connection, including reconnects. */
export default function controller(host) {
  host.on("connect", () => connect(host));
}
