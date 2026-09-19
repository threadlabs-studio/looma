// Framework-neutral contracts for Looma editor UI. Tiptap adapters consume these contracts but do
// not define them; every event is editor intent rather than an editor-framework command.

const prop = (type, options = {}) => Object.freeze({ type, ...options });
const event = (name, type) => Object.freeze({ name, type });
const component = ({ props = {}, events = [] } = {}) => Object.freeze({
  root: "div",
  slots: Object.freeze([]),
  props: Object.freeze(props),
  events: Object.freeze(events),
  methods: Object.freeze([]),
  dependencies: Object.freeze([]),
  stateAttributes: Object.freeze({}),
});
const tableCapabilityProps = Object.freeze({
  canAddRowBefore: prop("boolean", { attribute: "can-add-row-before", default: false }),
  canAddRowAfter: prop("boolean", { attribute: "can-add-row-after", default: false }),
  canAddColumnBefore: prop("boolean", { attribute: "can-add-column-before", default: false }),
  canAddColumnAfter: prop("boolean", { attribute: "can-add-column-after", default: false }),
  canDeleteRow: prop("boolean", { attribute: "can-delete-row", default: false }),
  canDeleteColumn: prop("boolean", { attribute: "can-delete-column", default: false }),
  canDeleteTable: prop("boolean", { attribute: "can-delete-table", default: false }),
  canMergeCells: prop("boolean", { attribute: "can-merge-cells", default: false }),
  canSplitCell: prop("boolean", { attribute: "can-split-cell", default: false }),
});

export const editorContracts = Object.freeze({
  "ui-editor-toolbar": Object.freeze({
    ...component(),
    slots: Object.freeze(["default"]),
  }),
  "ui-editor-slash-menu": component({
    props: {
      open: prop("boolean", { default: false }),
      query: prop("string", { default: "" }),
      items: prop("list(unknown)"),
      selectedIndex: prop("integer", { attribute: "selected-index", default: 0 }),
      anchorRect: prop("unknown", { attribute: "anchor-rect" }),
    },
    events: [
      event("looma-editor-slash-menu-highlight", "object({ index: integer })"),
      event("looma-editor-slash-menu-select", "object({ index: integer })"),
    ],
  }),
  "ui-editor-mention-menu": component({
    props: {
      open: prop("boolean", { default: false }),
      query: prop("string", { default: "" }),
      items: prop("list(unknown)"),
      selectedIndex: prop("integer", { attribute: "selected-index", default: 0 }),
      loading: prop("boolean", { default: false }),
      anchorRect: prop("unknown", { attribute: "anchor-rect" }),
    },
    events: [
      event("looma-editor-mention-menu-highlight", "object({ index: integer })"),
      event("looma-editor-mention-menu-select", "object({ index: integer })"),
    ],
  }),
  "ui-editor-insert-table-grid": component({
    props: {
      open: prop("boolean", { default: false }),
      maxRows: prop("integer", { attribute: "max-rows", default: 8 }),
      maxCols: prop("integer", { attribute: "max-cols", default: 8 }),
    },
    events: [event("looma-editor-insert-table", "object({ rows: integer, cols: integer, withHeaderRow: boolean })")],
  }),
  "ui-editor-table-context-menu": component({
    props: {
      open: prop("boolean", { default: false }),
      cellBackground: prop("string", { attribute: "cell-background", default: "" }),
      ...tableCapabilityProps,
    },
    events: [event("looma-editor-table-action", "object({ action: string })")],
  }),
  "ui-editor-table-toolbar": component({
    props: {
      open: prop("boolean", { default: false }),
      cellAlignment: prop("left | center | right", { attribute: "cell-alignment", default: "left" }),
      cellBackground: prop("string", { attribute: "cell-background", default: "" }),
      ...tableCapabilityProps,
    },
    events: [event("looma-editor-table-action", "object({ action: string })")],
  }),
  "ui-editor-table-overlay": component({
    props: {
      open: prop("boolean", { default: false }),
      rows: prop("integer", { default: 3 }),
      cols: prop("integer", { default: 3 }),
      rowBoundaries: prop("string | list(number)", { attribute: "row-boundaries" }),
      columnBoundaries: prop("string | list(number)", { attribute: "column-boundaries" }),
      activeCell: prop("string | list(number)", { attribute: "active-cell" }),
      hoveredCell: prop("string | list(number)", { attribute: "hovered-cell" }),
      geometry: prop("unknown"),
    },
    events: [event("looma-editor-table-overlay-action", "object({ action: string, boundaryIndex?: integer, rowIndex?: integer, columnIndex?: integer, anchor?: object({ left: number, top: number, right: number, bottom: number }) })")],
  }),
});

export function editorContractFor(tag) {
  const contract = editorContracts[tag];
  if (contract === undefined) throw new Error(`${tag}: missing Looma editor contract`);
  return contract;
}
