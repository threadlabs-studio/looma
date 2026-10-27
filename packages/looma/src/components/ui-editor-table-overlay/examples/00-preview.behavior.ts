import { componentRegistry } from "@nextwebwg/html-next/runtime";

/** Keep the controls aligned with the real cells at every preview width. */
export default function setup(root: HTMLElement): () => void {
  const surface = root.querySelector<HTMLElement>("[data-demo-table-controls]");
  const table = surface?.querySelector("table");
  if (!surface || !table) return () => {};
  const measure = () => {
    const origin = surface.getBoundingClientRect();
    const rows = [...table.rows], cells = [...(rows[0]?.cells ?? [])];
    if (!rows.length || !cells.length) return;
    const cell = cells[0].getBoundingClientRect();
    componentRegistry.update(surface, { geometry: {
      rowBoundaries: [...rows.map(row => row.getBoundingClientRect().top - origin.top), rows.at(-1)!.getBoundingClientRect().bottom - origin.top],
      columnBoundaries: [...cells.map(cell => cell.getBoundingClientRect().left - origin.left), cells.at(-1)!.getBoundingClientRect().right - origin.left],
      activeCell: { left: cell.left - origin.left, top: cell.top - origin.top, width: cell.width, height: cell.height, rowIndex: 0, columnIndex: 0 },
    } });
  };
  const observer = new ResizeObserver(measure);
  observer.observe(table);
  measure();
  return () => observer.disconnect();
}
