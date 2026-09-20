import type { FieldFormatter, FieldIssue, FieldValidation } from './validation';

/**
 * Canonical option shape at Looma's domain boundary.
 *
 * `id` is stable identity for rendering and selection bookkeeping; `value` is
 * the form/domain value. They are separate so labels or backend identifiers can
 * change without making list reconciliation or selected-option lookup ambiguous.
 * `metadata` stays property-only and lets rich rows retain their source record.
 */
export interface ComboboxOption<Metadata = unknown> {
  id: string;
  value: string;
  label: string;
  description?: string;
  metadata?: Metadata;
  group?: string;
  disabled?: boolean;
}
/**
 * One provider invocation. The field aborts `signal` when query/context changes,
 * so providers should forward it to fetch and must not publish side effects
 * after cancellation. `reason` distinguishes searching from an initial list
 * reveal or a dependent-field refresh.
 */
export interface ComboboxRequest<Context = unknown> {
  query: string;
  context: Context;
  signal: AbortSignal;
  reason: 'input' | 'disclosure' | 'context';
}
export type ComboboxProvider = (request: ComboboxRequest) => readonly ComboboxOption[] | Promise<readonly ComboboxOption[]>;
/**
 * Maps domain records at the boundary while retaining each source record as
 * typed metadata. This avoids parallel lookup maps in renderers without making
 * arbitrary domain fields part of Looma's serialized option contract.
 */
export function mapComboboxOptions<T>(rows: readonly T[], map: (row: T) => Omit<ComboboxOption<T>, 'metadata'>): ComboboxOption<T>[] {
  return rows.map(row => ({ ...map(row), metadata: row }));
}
/**
 * Search, invalidation, formatting, and validation policy for a combobox.
 * Static `options` and async `provider` share the same canonical option shape;
 * `context` is opaque dependency state owned by the application. Invalidation
 * policy determines what survives when that dependency changes, independently
 * of whether the current selection is controlled by a framework.
 */
export interface ComboboxConfig extends FieldValidation {
  /** Local source used when no provider is present; Looma applies label filtering by default. */
  options?: readonly ComboboxOption[];
  /**
   * Async source for the current query/context. Only the newest invocation may
   * publish rows: Looma aborts the prior signal before starting another request
   * and ignores a result that settles after abort or component disconnection.
   */
  provider?: ComboboxProvider;
  /**
   * Post-source visibility policy. When omitted, local options are matched by
   * label while provider results are trusted as already searched.
   */
  filter?: (option: ComboboxOption, query: string, context: unknown) => boolean;
  /**
   * Opaque dependency state compared by identity. Replace it when an upstream
   * field changes; Looma then cancels validation/lookup work, invalidates stale
   * option identity, applies `invalidation`, and searches with reason `context`.
   */
  context?: unknown;
  /**
   * Policy applied when `context` identity changes.
   *
   * - `retain-query` (default): clear a single canonical value, keep editing text.
   * - `clear`: clear both the single value and editing text.
   * - `retain`: keep both until the owner or user changes them.
   *
   * In multiple mode selected items are owner-owned; only `clear` also clears
   * the pending query.
   */
  invalidation?: 'clear' | 'retain-query' | 'retain';
  /** Input/context lookup delay in milliseconds; disclosure requests bypass it. */
  debounce?: number;
  /** Allows unmatched text to become the canonical value on commit. */
  allowFreeText?: boolean;
  /** Emits create intent for unmatched text; persistence remains application-owned. */
  allowCreate?: boolean;
  /** Presentation-only formatter; it cannot remove or reorder entered characters. */
  format?: FieldFormatter;
  /** Editing phase that invokes `format`; defaults to blur. */
  formatOn?: 'input' | 'blur';
  /** Interaction phase that starts validation; explicit `validate()` remains available. */
  validateOn?: 'input' | 'blur' | 'submit';
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
  kind: 'selection' | 'clear' | 'free-entry' | 'create' | 'invalidation';
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
