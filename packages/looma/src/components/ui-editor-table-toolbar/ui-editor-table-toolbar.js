import { backgrounds } from "../shared/editor.js";

const overflowSections = [
  ["Structure", [["add-row-before", "Add row above", "panel-top"], ["add-column-before", "Add column left", "panel-left"], ["toggle-header-row", "Header row", "rows"], ["toggle-header-column", "Header column", "columns"], ["move-row-up", "Move row up", "rows"], ["move-row-down", "Move row down", "rows"], ["move-column-left", "Move column left", "columns"], ["move-column-right", "Move column right", "columns"]]],
  ["Cells", [["clear-cells", "Clear selected cells", "eraser"], ["merge-cells", "Merge selected cells", "merge"], ["split-cell", "Split merged cell", "split"]]],
  ["Table", [["delete-row", "Delete row", "trash", "danger"], ["delete-column", "Delete column", "trash", "danger"], ["delete-table", "Delete table", "trash", "danger"]]],
];

// Lists the actions the table selection permits; the overflow menu opens and closes here.
export default function controller(host) {
  const element = host.element;
  const positionMenu = () => {
    const button = element.querySelector(".more");
    const menu = element.querySelector(".menu");
    if (!button || !menu) return;
    const rect = button.getBoundingClientRect();
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop ?? 0;
    const bottom = top + (viewport?.height ?? window.innerHeight);
    const above = rect.top - top - 20;
    const below = bottom - rect.bottom - 20;
    menu.style.maxHeight = `${Math.max(80, Math.floor(Math.max(above, below)))}px`;
    menu.style.top = below >= above ? "calc(100% + var(--ui-space-2))" : "auto";
    menu.style.bottom = below >= above ? "auto" : "calc(100% + var(--ui-space-2))";
  };
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
          .map(([action, label, icon, tone]) => ({ action, label, icon, danger: tone === "danger", checkable: action.startsWith("toggle-header-"), checked: action === "toggle-header-row" ? Boolean(host.state.headerRow) : action === "toggle-header-column" ? Boolean(host.state.headerColumn) : false })),
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
      if (host.state.overflowOpen) requestAnimationFrame(positionMenu);
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
    element.removeEventListener("click", onClick);
    document.removeEventListener("pointerdown", onOutside, true);
    document.removeEventListener("keydown", onKeydown, true);
    window.removeEventListener("resize", positionMenu);
    window.visualViewport?.removeEventListener("resize", positionMenu);
  };
}
