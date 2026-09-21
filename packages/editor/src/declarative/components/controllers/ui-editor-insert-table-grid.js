function bounded(value, fallback) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  return Math.min(10, Math.max(1, Number.isFinite(parsed) ? parsed : fallback));
}

export default function controller(host) {
  const element = host.element;
  let selectedRows = 3; let selectedCols = 3; let previewRows = null; let previewCols = null;
  let lastHeaderRow = Boolean(host.state.headerRow);
  let withHeaderRow = lastHeaderRow; let selectionCommitted = false;

  const updateSelection = () => {
    const activeRows = previewRows ?? selectedRows; const activeCols = previewCols ?? selectedCols;
    const hint = element.querySelector(".ui-editor-insert-table-grid__hint");
    if (hint) hint.textContent = previewRows !== null && previewCols !== null
      ? `${activeRows} × ${activeCols}`
      : `${selectedRows} × ${selectedCols}${selectionCommitted ? " selected" : ""}`;
    for (const cell of element.querySelectorAll("[data-row][data-col]")) {
      const selected = Number(cell.dataset.row) <= activeRows && Number(cell.dataset.col) <= activeCols;
      cell.classList.toggle("ui-editor-insert-table-grid__cell--selected", selected);
      cell.setAttribute("aria-pressed", String(selected));
    }
  };
  const render = () => {
    const configuredHeaderRow = Boolean(host.state.headerRow);
    if (configuredHeaderRow !== lastHeaderRow) {
      lastHeaderRow = configuredHeaderRow;
      withHeaderRow = configuredHeaderRow;
    }
    element.hidden = !host.state.open;
    if (!host.state.open) return;
    const maxRows = bounded(host.state.maxRows, 8); const maxCols = bounded(host.state.maxCols, 8);
    const cells = [];
    for (let row = 1; row <= maxRows; row += 1) for (let col = 1; col <= maxCols; col += 1) {
      const selected = row <= selectedRows && col <= selectedCols;
      cells.push(`<button type="button" data-row="${row}" data-col="${col}" aria-label="${row} rows by ${col} columns" aria-pressed="${selected}" class="ui-editor-insert-table-grid__cell${selected ? " ui-editor-insert-table-grid__cell--selected" : ""}"></button>`);
    }
    element.innerHTML = `<div class="ui-editor-insert-table-grid"><p class="ui-editor-insert-table-grid__hint">${selectedRows} × ${selectedCols}</p><div class="ui-editor-insert-table-grid__grid" role="group" aria-label="Table dimensions" style="--ui-editor-table-grid-rows:${maxRows};--ui-editor-table-grid-cols:${maxCols}">${cells.join("")}</div><label class="ui-editor-insert-table-grid__header"><input type="checkbox" checked> Header row</label><button type="button" data-insert-table>Insert table</button></div>`;
    const checkbox = element.querySelector('input[type="checkbox"]');
    if (checkbox) { checkbox.checked = withHeaderRow; checkbox.addEventListener("change", () => { withHeaderRow = checkbox.checked; }); }
    updateSelection();
  };
  const onClick = (event) => {
    const cell = event.target.closest?.("[data-row][data-col]");
    if (cell) {
      selectedRows = Number(cell.dataset.row); selectedCols = Number(cell.dataset.col);
      previewRows = null; previewCols = null; selectionCommitted = true; updateSelection(); return;
    }
    if (event.target.closest?.("[data-insert-table]")) {
      host.dispatch("insert", { rows: selectedRows, cols: selectedCols, withHeaderRow });
    }
  };
  const onMouseover = (event) => {
    const cell = event.target.closest?.("[data-row][data-col]");
    if (!cell) { previewRows = null; previewCols = null; updateSelection(); return; }
    previewRows = Number(cell.dataset.row); previewCols = Number(cell.dataset.col); updateSelection();
  };
  const onMouseleave = () => { previewRows = null; previewCols = null; updateSelection(); };
  element.addEventListener("click", onClick); element.addEventListener("mouseover", onMouseover); element.addEventListener("mouseleave", onMouseleave);
  const stop = host.effect(render); render();
  return () => { stop(); element.removeEventListener("click", onClick); element.removeEventListener("mouseover", onMouseover); element.removeEventListener("mouseleave", onMouseleave); };
}
