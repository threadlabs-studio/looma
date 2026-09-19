import { backgrounds, icon } from "./shared/editor.js";

const overflowSections = [
  ["Structure", [["add-row-before", "Add row above", "panel-top", "canAddRowBefore"], ["add-column-before", "Add column left", "panel-left", "canAddColumnBefore"]]],
  ["Cells", [["clear-cells", "Clear selected cells", "eraser"], ["merge-cells", "Merge selected cells", "merge", "canMergeCells"], ["split-cell", "Split merged cell", "split", "canSplitCell"]]],
  ["Table", [["delete-row", "Delete row", "trash", "canDeleteRow", "danger"], ["delete-column", "Delete column", "trash", "canDeleteColumn", "danger"], ["delete-table", "Delete table", "trash", "canDeleteTable", "danger"]]],
];

export default function controller(host) {
  const element = host.element; let overflowOpen = false;
  const render = () => {
    element.hidden = !host.state.open; if (!host.state.open) { overflowOpen = false; return; }
    const active = `align-${host.state.cellAlignment === "center" || host.state.cellAlignment === "right" ? host.state.cellAlignment : "left"}`;
    const alignments = [["align-left", "Align left"], ["align-center", "Align center"], ["align-right", "Align right"]];
    const structure = [["add-row-after", "Add row", "rows", "canAddRowAfter"], ["add-column-after", "Add column", "columns", "canAddColumnAfter"]].filter(([, , , capability]) => host.state[capability]);
    const background = String(host.state.cellBackground ?? "");
    const menu = overflowOpen ? `<div class="ui-editor-table-toolbar__menu" role="menu" aria-label="More table actions"><div class="ui-editor-table-toolbar__menu-section" role="none"><div class="ui-editor-table-toolbar__menu-heading" role="presentation">Background</div><div class="ui-editor-table-toolbar__swatches" role="group" aria-label="Cell background">${backgrounds.map(([action, label, swatch]) => { const selected = swatch === background; return `<button type="button" class="ui-editor-table-toolbar__swatch-button" role="menuitemradio" aria-checked="${selected}" data-action="${action}"${selected ? ' data-selected="true"' : ""}><span class="ui-editor-table-toolbar__swatch${swatch ? "" : " ui-editor-table-toolbar__swatch--default"}"${swatch ? ` style="--ui-editor-table-toolbar-swatch:${swatch}"` : ""}></span><span>${label}</span></button>`; }).join("")}</div></div>${overflowSections.map(([heading, actions]) => { const available = actions.filter(([, , , capability]) => !capability || host.state[capability]); return available.length ? `<div class="ui-editor-table-toolbar__menu-section ui-editor-table-toolbar__menu-section--divided" role="none"><div class="ui-editor-table-toolbar__menu-heading" role="presentation">${heading}</div>${available.map(([action, label, iconName, , tone]) => `<button type="button" role="menuitem" data-action="${action}"${tone ? ` data-tone="${tone}"` : ""}>${icon(iconName)}<span>${label}</span></button>`).join("")}</div>` : ""; }).join("")}</div>` : "";
    element.innerHTML = `<div class="ui-editor-table-toolbar" role="toolbar" aria-label="Table actions"><div class="ui-editor-table-toolbar__group" role="group" aria-label="Cell alignment">${alignments.map(([action, label]) => `<button type="button" class="ui-editor-table-toolbar__icon-button" data-action="${action}" aria-label="${label}" title="${label}" aria-pressed="${action === active}" data-active="${action === active}">${icon(action)}</button>`).join("")}</div>${structure.length ? '<div class="ui-editor-table-toolbar__sep" aria-hidden="true"></div><div class="ui-editor-table-toolbar__group" role="group" aria-label="Table structure">' + structure.map(([action, label, iconName]) => `<button type="button" data-action="${action}">${icon(iconName)}<span>${label}</span></button>`).join("") + "</div>" : ""}<div class="ui-editor-table-toolbar__sep" aria-hidden="true"></div><div class="ui-editor-table-toolbar__overflow"><button type="button" class="ui-editor-table-toolbar__more" data-action="toggle-overflow" aria-haspopup="menu" aria-expanded="${overflowOpen}">${icon("table")}<span>Table options</span>${icon("chevron-down", "looma-icon looma-icon--chevron")}</button>${menu}</div></div>`;
  };
  const onClick = (event) => {
    const action = event.target.closest?.("[data-action]")?.dataset.action; if (!action) return;
    if (action === "toggle-overflow") { overflowOpen = !overflowOpen; render(); return; }
    overflowOpen = false; render(); host.dispatch("looma-editor-table-action", { action });
  };
  const onOutside = (event) => { if (!overflowOpen || event.composedPath().includes(element)) return; overflowOpen = false; render(); };
  element.addEventListener("click", onClick); document.addEventListener("pointerdown", onOutside, true);
  const stop = host.effect(render); render();
  return () => { stop(); element.removeEventListener("click", onClick); document.removeEventListener("pointerdown", onOutside, true); };
}
