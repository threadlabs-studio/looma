/** Event contract for the declarative table-dimension picker. */

/** Table dimensions emitted when a cell is activated. */
export interface InsertTableEventDetail {
  rows: number;
  cols: number;
  withHeaderRow: boolean;
}
