import { backgrounds, icon, viewport } from "../shared/editor.js";

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

export default function controller(host) {
  const element = host.element;
  let positionFrame;
  const position = () => {
    positionFrame = undefined;
    const menu = element.querySelector(".ui-editor-table-context-menu"); if (!menu) return;
    menu.style.translate = "";
    const rect = menu.getBoundingClientRect(); const view = viewport(); const inset = 12;
    let x = 0; let y = 0;
    if (rect.left < view.left + inset) x = view.left + inset - rect.left;
    else if (rect.right > view.right - inset) x = view.right - inset - rect.right;
    if (rect.top < view.top + inset) y = view.top + inset - rect.top;
    else if (rect.bottom > view.bottom - inset) y = view.bottom - inset - rect.bottom;
    if (x || y) menu.style.translate = `${x}px ${y}px`;
  };
  const schedule = () => { if (positionFrame) cancelAnimationFrame(positionFrame); positionFrame = requestAnimationFrame(position); };
  const render = () => {
    element.hidden = !host.state.open; if (!host.state.open) return;
    const enabled = new Set(Array.isArray(host.state.actions) ? host.state.actions : []);
    const background = String(host.state.cellBackground ?? "");
    const rendered = [];
    const swatches = backgrounds.filter(([action]) => enabled.has(action)).map(([action, label, swatch]) => {
      const selected = swatch === background;
      return `<button type="button" class="ui-editor-table-context-menu__swatch-button" role="menuitemradio" aria-checked="${selected}" data-action="${action}"${selected ? ' data-selected="true"' : ""}><span class="ui-editor-table-context-menu__swatch${swatch ? "" : " ui-editor-table-context-menu__swatch--default"}"${swatch ? ` style="--ui-editor-table-context-swatch:${swatch}"` : ""}></span><span class="ui-editor-table-context-menu__swatch-label">${label}</span></button>`;
    }).join("");
    if (swatches) rendered.push(`<div class="ui-editor-table-context-menu__section" role="none"><div class="ui-editor-table-context-menu__heading" role="presentation">Cell background</div><div class="ui-editor-table-context-menu__swatches" role="group" aria-label="Cell background">${swatches}</div></div>`);
    for (const [heading, actions] of sections) {
      const available = actions.filter(([action]) => enabled.has(action));
      if (!available.length) continue;
      rendered.push(`<div class="ui-editor-table-context-menu__sep"></div><div class="ui-editor-table-context-menu__section" role="none"><div class="ui-editor-table-context-menu__heading" role="presentation">${heading}</div>${available.map(([action, label, iconName, tone]) => `<button type="button" role="menuitem" data-action="${action}"${tone ? ` data-tone="${tone}"` : ""}>${icon(iconName)}<span>${label}</span></button>`).join("")}</div>`);
    }
    element.innerHTML = `<div class="ui-editor-table-context-menu" role="menu">${rendered.join("")}</div>`; schedule();
  };
  const onClick = (event) => { const action = event.target.closest?.("[data-action]")?.dataset.action; if (action) host.dispatch("action", { action }); };
  element.addEventListener("click", onClick); window.addEventListener("resize", schedule); window.visualViewport?.addEventListener("resize", schedule); window.visualViewport?.addEventListener("scroll", schedule);
  const stop = host.effect(render); render();
  return () => { stop(); element.removeEventListener("click", onClick); window.removeEventListener("resize", schedule); window.visualViewport?.removeEventListener("resize", schedule); window.visualViewport?.removeEventListener("scroll", schedule); if (positionFrame) cancelAnimationFrame(positionFrame); };
}
