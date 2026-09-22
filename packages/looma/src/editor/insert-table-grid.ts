/** Event contract for the declarative table-dimension picker. */

/** Confirmed table dimensions emitted after preview state has been committed. */
export interface InsertTableEventDetail {
  rows: number;
  cols: number;
  withHeaderRow: boolean;
}
