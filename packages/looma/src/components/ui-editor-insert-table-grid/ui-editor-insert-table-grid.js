function bounded(value, fallback) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  return Math.min(10, Math.max(1, Number.isFinite(parsed) ? parsed : fallback));
}

// Lays out the grid cells, previews the size under the pointer, and inserts the chosen size.
export default function controller(host) {
  const element = host.element;
  let selected = { rows: 3, cols: 3 };
  let preview = null;
  let committed = false;
  let lastHeaderRow = Boolean(host.state.headerRow);
  host.state.withHeaderRow = lastHeaderRow;

  const update = () => {
    const rows = bounded(host.state.maxRows, 8);
    const cols = bounded(host.state.maxCols, 8);
    const active = preview ?? selected;
    host.state.rows = rows;
    host.state.cols = cols;
    host.state.hint = preview ? `${preview.rows} × ${preview.cols}` : `${selected.rows} × ${selected.cols}${committed ? " selected" : ""}`;
    host.state.cells = Array.from({ length: rows * cols }, (_, index) => {
      const row = Math.floor(index / cols) + 1;
      const col = (index % cols) + 1;
      return { key: `${row}:${col}`, row, col, label: `${row} rows by ${col} columns`, selected: row <= active.rows && col <= active.cols };
    });
  };
  const stop = host.effect(() => {
    const headerRow = Boolean(host.state.headerRow);
    if (headerRow !== lastHeaderRow) {
      lastHeaderRow = headerRow;
      host.state.withHeaderRow = headerRow;
    }
    update();
  });
  const cellOf = (event) => {
    const cell = event.target.closest?.("[data-row][data-col]");
    return cell && { rows: Number(cell.dataset.row), cols: Number(cell.dataset.col) };
  };
  const onClick = (event) => {
    const cell = cellOf(event);
    if (cell) {
      selected = cell;
      preview = null;
      committed = true;
      update();
    } else if (host.refs.insert.contains(event.target)) {
      host.dispatch("insert", { ...selected, withHeaderRow: host.state.withHeaderRow });
    }
  };
  const onChange = () => { host.state.withHeaderRow = host.refs.header.checked; };
  const onMouseover = (event) => {
    preview = cellOf(event);
    update();
  };
  const onMouseleave = () => {
    preview = null;
    update();
  };
  element.addEventListener("click", onClick);
  element.addEventListener("mouseover", onMouseover);
  element.addEventListener("mouseleave", onMouseleave);
  host.refs.header.addEventListener("change", onChange);
  return () => {
    stop();
    element.removeEventListener("click", onClick);
    element.removeEventListener("mouseover", onMouseover);
    element.removeEventListener("mouseleave", onMouseleave);
    host.refs.header.removeEventListener("change", onChange);
  };
}
