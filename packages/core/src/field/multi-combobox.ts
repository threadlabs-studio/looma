import type { ComboboxOption } from './combobox';

/** Canonical selected item; multiple mode retains the full option for chip rendering. */
export type MultiComboboxItem = ComboboxOption;

/**
 * One item-list transition. The list itself is owner-controlled; `index`
 * identifies the insertion position or the removed item's former position
 * rather than authorizing Looma to mutate an application collection.
 */
export interface MultiComboboxItemChange {
  item: MultiComboboxItem;
  index: number;
  trigger: 'keyboard' | 'pointer' | 'programmatic';
}

/**
 * Request to create an item from unmatched editing text.
 * The application owns deduplication, persistence, and the eventual controlled
 * item-list update.
 */
export interface MultiComboboxCreate {
  query: string;
  trigger: 'keyboard' | 'pointer' | 'programmatic';
}
