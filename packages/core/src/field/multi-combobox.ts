import type { ComboboxOption } from './combobox';

export type MultiComboboxItem = ComboboxOption;

export interface MultiComboboxItemChange {
  item: MultiComboboxItem;
  index: number;
  trigger: 'keyboard' | 'pointer' | 'programmatic';
}

export interface MultiComboboxCreate {
  query: string;
  trigger: 'keyboard' | 'pointer' | 'programmatic';
}
