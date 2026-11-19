import { connect as connectScrollRegion } from "../ui-table/ui-table.js";

// The root is a keyboard-scrollable region while the table scrolls, as Table's is. Frozen columns and
// rows stay in view with position: sticky, which needs each one's offset: the sum of the frozen
// columns before it (or after it, for end), and the header plus the frozen rows above it. The
// controller measures them and publishes --_ui-col-<index> and --_ui-row-<index> on the table, and
// measures again when a cell resizes or the rows or columns change.
export function connect(host) {
  const element = host.element;
  const stopRegion = connectScrollRegion(host);
  const table = element.querySelector(":scope > table");
  if (!table) return stopRegion;

  let published = [];
  let frame = 0;
  const publish = (name, value) => {
    table.style.setProperty(name, `${value}px`);
    published.push(name);
  };
  const measure = () => {
    frame = 0;
    for (const name of published) table.style.removeProperty(name);
    published = [];
    const columns = host.state.columns ?? [];
    const headers = Array.from(table.tHead?.rows[0]?.cells ?? []);
    let start = 0;
    headers.forEach((cell, index) => {
      if (columns[index]?.frozen !== "start") return;
      publish(`--_ui-col-${index}`, start);
      start += cell.getBoundingClientRect().width;
    });
    let end = 0;
    for (let index = headers.length - 1; index >= 0; index -= 1) {
      if (columns[index]?.frozen !== "end") continue;
      publish(`--_ui-col-${index}`, end);
      end += headers[index].getBoundingClientRect().width;
    }
    let top = table.tHead?.getBoundingClientRect().height ?? 0;
    for (const [index, row] of Array.from(table.tBodies[0]?.rows ?? []).entries()) {
      if (!row.classList.contains("frozen")) break;
      publish(`--_ui-row-${index}`, top);
      top += row.getBoundingClientRect().height;
    }
    observe();
  };
  const schedule = () => {
    frame ||= requestAnimationFrame(measure);
  };

  const resize = new ResizeObserver(schedule);
  const observe = () => {
    resize.disconnect();
    for (const cell of table.tHead?.rows[0]?.cells ?? []) resize.observe(cell);
    for (const row of table.tBodies[0]?.rows ?? []) {
      if (!row.classList.contains("frozen")) break;
      resize.observe(row);
    }
  };
  const changes = new MutationObserver(schedule);
  changes.observe(table, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-ui-frozen"] });
  measure();
  return () => {
    cancelAnimationFrame(frame);
    resize.disconnect();
    changes.disconnect();
    for (const name of published) table.style.removeProperty(name);
    stopRegion?.();
  };
}
