/**
 * Structural Standard Schema v1 boundary.
 *
 * Looma intentionally depends on this protocol shape instead of a schema
 * library. Consumers can bring Valibot, Zod, or another compliant validator
 * without placing that implementation in Looma's runtime or public model.
 *
 * @contract Implementations must expose Standard Schema v1 and may complete
 * validation synchronously or asynchronously without changing the result shape.
 */
export interface FieldSchema<Output = unknown> {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => FieldSchemaResult<Output> | Promise<FieldSchemaResult<Output>>;
    readonly types?: { readonly input: unknown; readonly output: Output };
  };
}

/**
 * Renderable validation problem, optionally located within structured input.
 * Warning severity preserves accepted output; omitted severity is an error.
 */
export interface FieldIssue {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>;
  readonly severity?: 'error' | 'warning';
}

/**
 * Standard Schema outcome: either a typed value or one or more reported issues.
 */
export type FieldSchemaResult<T = unknown> =
  | { readonly value: T; readonly issues?: undefined }
  | { readonly issues: readonly FieldIssue[] };
/** One validation run, including the cancellation signal owned by the field. */
export interface FieldRequest<Context = unknown> {
  raw: string;
  value: string | null;
  context: Context;
  signal: AbortSignal;
}

/** Completed field-pipeline snapshot returned to rendering state. */
export interface FieldResult<Output = unknown> {
  output?: Output;
  issues: readonly FieldIssue[];
}
/**
 * Ordered stages in a field's value pipeline.
 *
 * Parsing converts the editing string, schema validation establishes a typed
 * value, normalization prepares accepted output, and the final validator
 * applies domain rules. Externally supplied `issues` are appended last so a
 * server error can coexist with local warnings. Stages may be asynchronous and
 * must treat `request.signal` as the ownership boundary for stale work.
 *
 * @lifecycle Looma invokes configured stages in pipeline order for one request;
 * callbacks must treat its abort signal as cancellation of that entire run.
 */
export interface FieldValidation {
  schema?: FieldSchema;
  parse?: (raw: string, request: FieldRequest) => unknown | Promise<unknown>;
  normalize?: (value: unknown, request: FieldRequest) => unknown | Promise<unknown>;
  validator?: (value: unknown, request: FieldRequest) => Partial<FieldResult> | Promise<Partial<FieldResult>>;
  issues?: readonly FieldIssue[];
}

/** Caret or selection offsets within the current editing buffer. */
export interface FieldSelection { start: number; end: number; direction?: 'forward' | 'backward' | 'none' }

/** Presentation buffer paired with the selection that remains active within it. */
export interface FieldFormat { display: string; selection: FieldSelection }

/**
 * Proposes presentation-only text and caret placement for an editing buffer.
 * Returning `undefined` declines formatting for that invocation.
 *
 * @contract The proposal must preserve every input character in order and place
 * both selection offsets inside the returned display; invalid proposals are ignored.
 */
export type FieldFormatter = (raw: string, selection: FieldSelection) => FieldFormat | undefined;

/**
 * Applies presentation-only editing format without changing user input.
 *
 * Formatting is additive: every original character must survive in order, and
 * the returned selection must describe a valid range in the displayed string.
 * Invalid or throwing formatters fail closed to the original buffer. Semantic
 * cleanup belongs in `normalize`, after validation, never in the visible
 * editing value where it could move the caret or destroy unfinished input.
 */
export function formatEditingValue(raw: string, selection: FieldSelection, format?: FieldFormatter): FieldFormat {
  const unchanged = { display: raw, selection };
  if (!format) return unchanged;
  let result: FieldFormat | undefined;
  try { result = format(raw, selection); } catch { return unchanged; }
  if (!result) return unchanged;
  const characters = Array.from(raw);
  let cursor = 0;
  for (const character of result.display) if (character === characters[cursor]) cursor += 1;
  if (!Number.isInteger(result.selection.start) || !Number.isInteger(result.selection.end) || cursor !== characters.length || result.selection.start < 0 || result.selection.end < result.selection.start
    || result.selection.end > result.display.length) return unchanged;
  return result;
}

/**
 * Runs the field pipeline while preserving warning and cancellation semantics.
 *
 * Error-severity issues stop normalization and custom validation; warnings do
 * not. An aborted request is rethrown rather than converted to a user-visible
 * issue so obsolete work cannot overwrite newer field state. Other thrown
 * values are intentionally converted at this UI boundary because validation
 * failures must be renderable rather than become unhandled promise rejections.
 *
 * @lifecycle The request signal is checked before and after every awaited stage;
 * aborting invalidates the entire run rather than returning a partial result.
 * @failure Non-abort failures become field issues. Abort failures propagate so
 * stale work cannot be mistaken for the result of the current value.
 */
export async function validateField(request: FieldRequest, config: FieldValidation): Promise<FieldResult> {
  let output: unknown = request.raw;
  let issues: readonly FieldIssue[] = [];
  const check = () => request.signal.throwIfAborted();
  try {
    check();
    if (config.parse) output = await config.parse(request.raw, request);
    check();
    if (config.schema) {
      const result = await config.schema['~standard'].validate(output);
      check();
      if (result.issues) issues = result.issues;
      else if ('value' in result) output = result.value;
    }
    if (!issues.some(issue => issue.severity !== 'warning')) {
      if (config.normalize) output = await config.normalize(output, request);
      check();
      if (config.validator) {
        const result = await config.validator(output, request);
        check();
        issues = [...issues, ...(result.issues ?? [])];
        if ('output' in result) output = result.output;
      }
    }
  } catch (error) {
    check();
    issues = [{ message: error instanceof Error ? error.message : 'Unable to validate this value.' }];
  }
  issues = [...issues, ...(config.issues ?? [])];
  return { output: issues.some(issue => issue.severity !== 'warning') ? undefined : output, issues };
}
