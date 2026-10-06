function bounded(value, fallback) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  return Math.min(10, Math.max(1, Number.isFinite(parsed) ? parsed : fallback));
}

// Lays out the grid cells and inserts the chosen size by pointer or keyboard.
function connect(host) {
  const element = host.element;
  let selected = { rows: 3, cols: 3 };
  let preview = null;
  let lastHeaderRow = Boolean(host.props.headerRow.value);
  host.state.withHeaderRow = lastHeaderRow;

  const update = () => {
    const rows = bounded(host.props.maxRows.value, 8);
    const cols = bounded(host.props.maxCols.value, 8);
    selected = { rows: Math.min(selected.rows, rows), cols: Math.min(selected.cols, cols) };
    const active = preview ?? selected;
    host.state.rows = rows;
    host.state.cols = cols;
    host.state.hint = `${active.rows} × ${active.cols}`;
    host.state.cells = Array.from({ length: rows * cols }, (_, index) => {
      const row = Math.floor(index / cols) + 1;
      const col = (index % cols) + 1;
      return { key: `${row}:${col}`, row, col, label: `${row} rows by ${col} columns`, selected: row <= active.rows && col <= active.cols, tabIndex: row === active.rows && col === active.cols ? 0 : -1 };
    });
  };
  const stop = host.effect(() => {
    const headerRow = Boolean(host.props.headerRow.value);
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
      update();
      host.dispatch("insert", { ...selected, withHeaderRow: host.state.withHeaderRow });
    }
  };
  const onChange = () => { host.state.withHeaderRow = host.refs.header.checked; };
  const onMouseover = (event) => {
    preview = cellOf(event);
    update();
  };
  const onMouseleave = () => {
    if (host.refs.grid.contains(element.ownerDocument.activeElement)) return;
    preview = null;
    update();
  };
  const onFocusin = (event) => {
    const cell = cellOf(event);
    if (!cell) return;
    preview = cell;
    update();
  };
  const onFocusout = () => queueMicrotask(() => {
    if (host.refs.grid.contains(element.ownerDocument.activeElement)) return;
    preview = null;
    update();
  });
  const onKeydown = (event) => {
    const current = cellOf(event);
    if (!current) return;
    const rows = host.state.rows;
    const cols = host.state.cols;
    let next = current;
    if (event.key === "ArrowRight") next = { ...current, cols: Math.min(cols, current.cols + 1) };
    else if (event.key === "ArrowLeft") next = { ...current, cols: Math.max(1, current.cols - 1) };
    else if (event.key === "ArrowDown") next = { ...current, rows: Math.min(rows, current.rows + 1) };
    else if (event.key === "ArrowUp") next = { ...current, rows: Math.max(1, current.rows - 1) };
    else if (event.key === "Home") next = { ...current, cols: 1 };
    else if (event.key === "End") next = { ...current, cols };
    else return;
    event.preventDefault();
    const cell = Array.from(host.refs.grid.querySelectorAll("[data-row][data-col]")).find((candidate) =>
      Number(candidate.dataset.row) === next.rows && Number(candidate.dataset.col) === next.cols);
    cell?.focus();
  };
  element.addEventListener("click", onClick);
  element.addEventListener("mouseover", onMouseover);
  element.addEventListener("mouseleave", onMouseleave);
  element.addEventListener("focusin", onFocusin);
  element.addEventListener("focusout", onFocusout);
  element.addEventListener("keydown", onKeydown);
  host.refs.header.addEventListener("change", onChange);
  return () => {
    stop();
    element.removeEventListener("click", onClick);
    element.removeEventListener("mouseover", onMouseover);
    element.removeEventListener("mouseleave", onMouseleave);
    element.removeEventListener("focusin", onFocusin);
    element.removeEventListener("focusout", onFocusout);
    element.removeEventListener("keydown", onKeydown);
    host.refs.header.removeEventListener("change", onChange);
  };
}

/** Keep DOM setup and its cleanup tied to each connection, including reconnects. */
export default function controller(host) {
  host.on("connect", () => connect(host));
}
