import type { FieldFormatter, FieldIssue, FieldValidation } from './validation';

export interface ComboboxOption<Metadata = unknown> {
  id: string;
  value: string;
  label: string;
  description?: string;
  metadata?: Metadata;
  group?: string;
  disabled?: boolean;
}
export interface ComboboxRequest<Context = unknown> {
  query: string;
  context: Context;
  signal: AbortSignal;
  reason: 'input' | 'disclosure' | 'context';
}
export type ComboboxProvider = (request: ComboboxRequest) => readonly ComboboxOption[] | Promise<readonly ComboboxOption[]>;
/** Map domain records at the boundary, preserving typed metadata for rich rows. */
export function mapComboboxOptions<T>(rows: readonly T[], map: (row: T) => Omit<ComboboxOption<T>, 'metadata'>): ComboboxOption<T>[] {
  return rows.map(row => ({ ...map(row), metadata: row }));
}
export interface ComboboxConfig extends FieldValidation {
  options?: readonly ComboboxOption[];
  provider?: ComboboxProvider;
  filter?: (option: ComboboxOption, query: string, context: unknown) => boolean;
  context?: unknown;
  invalidation?: 'clear' | 'retain-query' | 'retain';
  debounce?: number;
  allowFreeText?: boolean;
  allowCreate?: boolean;
  format?: FieldFormatter;
  formatOn?: 'input' | 'blur';
  validateOn?: 'input' | 'blur' | 'submit';
}
export interface ComboboxChange {
  value: string | null;
  query: string;
  option: ComboboxOption | null;
  kind: 'selection' | 'clear' | 'free-entry' | 'create' | 'invalidation';
  trigger: 'keyboard' | 'pointer' | 'programmatic';
}
export interface ComboboxValidationState {
  status: 'pristine' | 'pending' | 'valid' | 'warning' | 'error';
  touched: boolean;
  dirty: boolean;
  issues: readonly FieldIssue[];
  output?: unknown;
}
