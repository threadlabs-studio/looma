// Two jobs, both kept current as the table changes.
//
// Column alignment: data-align on a <col> (or on a <colgroup> without cols) aligns every cell in that
// column. CSS cannot tell which column a cell is in once colspan and rowspan shift it, so the
// controller works out each cell's column and sets data-column-align on it; a cell's own data-align
// overrides it in the styles.
//
// Scroll region: while the table is wider than the root, or taller than a root of bounded height, the
// root scrolls it: it becomes a region a keyboard can focus and scroll with the arrow keys, named by
// the table's caption unless the author named it. When the table fits, the root is plain again, so
// it is not an empty stop in the tab order. An author who set role or tabindex keeps them.
let captions = 0;

// The attributes that move a cell to another column or change a column's alignment. The controller
// writes none of them, so its own writes never wake the observer.
const LAYOUT_ATTRIBUTES = ["data-align", "span", "colspan", "rowspan"];

/** The alignment of each column, from the table's <col> and <colgroup> elements. */
function columnAlignments(table) {
  const alignments = [];
  for (const group of table.querySelectorAll(":scope > colgroup")) {
    const cols = group.querySelectorAll(":scope > col");
    for (const column of cols.length ? cols : [group]) {
      for (let index = 0; index < column.span; index += 1) alignments.push(column.dataset.align);
    }
  }
  return alignments;
}

/**
 * Sets data-column-align on every cell whose columns share an alignment. A cell starts in the first
 * column its row has free: a rowspan above holds columns in the rows it covers, within its row group,
 * as the HTML table model does.
 */
function alignColumns(table) {
  const alignments = columnAlignments(table);
  const sections = [table.tHead, ...table.tBodies, table.tFoot].filter(Boolean);
  for (const section of sections) {
    const held = [];
    for (const row of section.rows) {
      let column = 0;
      for (const cell of row.cells) {
        while (held[column] > 0) column += 1;
        const spanned = alignments.slice(column, column + cell.colSpan);
        const align = spanned.length === cell.colSpan && spanned.every((value) => value === spanned[0]) ? spanned[0] : undefined;
        if (align) {
          if (cell.getAttribute("data-column-align") !== align) cell.setAttribute("data-column-align", align);
        } else if (cell.hasAttribute("data-column-align")) {
          cell.removeAttribute("data-column-align");
        }
        // rowspan="0" runs to the end of the row group.
        for (let index = 0; index < cell.colSpan; index += 1) held[column + index] = cell.rowSpan || Infinity;
        column += cell.colSpan;
      }
      for (let index = 0; index < held.length; index += 1) if (held[index] > 0) held[index] -= 1;
    }
  }
}

export default function controller(host) {
  const element = host.element;
  const manageRegion = !element.hasAttribute("tabindex") && !element.hasAttribute("role");

  let labelled = false;
  const updateRegion = () => {
    if (!manageRegion) return;
    const scrolls = element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight;
    if (!scrolls) {
      element.removeAttribute("role");
      element.removeAttribute("tabindex");
      if (labelled) element.removeAttribute("aria-labelledby");
      labelled = false;
      return;
    }
    element.setAttribute("role", "region");
    element.setAttribute("tabindex", "0");
    const caption = element.querySelector(":scope > table > caption");
    if (caption && !element.hasAttribute("aria-label") && !element.hasAttribute("aria-labelledby")) {
      caption.id ||= `ui-table-caption-${++captions}`;
      element.setAttribute("aria-labelledby", caption.id);
      labelled = true;
    }
  };

  const align = () => {
    for (const table of element.querySelectorAll(":scope > table")) alignColumns(table);
  };

  const resize = new ResizeObserver(updateRegion);
  const observeSizes = () => {
    resize.disconnect();
    resize.observe(element);
    for (const child of element.children) resize.observe(child);
  };
  // Rows added or removed, a table rendered or replaced, or a span or alignment changed.
  // ponytail: re-aligns every cell per batch of changes, O(cells); fine for presentation tables.
  const changes = new MutationObserver((records) => {
    if (records.some((record) => record.target === element && record.type === "childList")) observeSizes();
    align();
    updateRegion();
  });
  changes.observe(element, { childList: true, subtree: true, attributeFilter: LAYOUT_ATTRIBUTES });
  observeSizes();
  align();
  updateRegion();
  return () => {
    resize.disconnect();
    changes.disconnect();
  };
}
