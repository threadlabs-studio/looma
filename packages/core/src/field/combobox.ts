import type { FieldIssue } from './validation';

/**
 * Canonical option shape at Looma's domain boundary.
 *
 * `id` is stable identity for rendering and selection bookkeeping; `value` is
 * the form/domain value. They are separate so labels or backend identifiers can
 * change without making list reconciliation or selected-option lookup ambiguous.
 * Options are authored as `<option>`/`<optgroup>` children; selected items cross
 * the attribute boundary as JSON in this shape.
 */
export interface ComboboxOption {
  id: string;
  value: string;
  label: string;
  group?: string;
  disabled?: boolean;
}
/**
 * Semantic value transition emitted by the combobox.
 * `kind` explains the state-machine path while `trigger` records user modality;
 * consumers should not infer either from low-level input/click events.
 */
export interface ComboboxChange {
  value: string | null;
  query: string;
  option: ComboboxOption | null;
  kind: 'selection' | 'clear' | 'free-entry' | 'create';
  trigger: 'keyboard' | 'pointer' | 'programmatic';
}
/**
 * Renderable validation snapshot. `output` is defined only when the current
 * value passed all error-severity checks; warnings preserve output and remain
 * visible.
 */
export interface ComboboxValidationState {
  status: 'pristine' | 'pending' | 'valid' | 'warning' | 'error';
  touched: boolean;
  dirty: boolean;
  issues: readonly FieldIssue[];
  output?: unknown;
}
