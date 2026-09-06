/** Structural Standard Schema v1 boundary; no schema-library runtime dependency. */
export interface FieldSchema<Output = unknown> {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => FieldSchemaResult<Output> | Promise<FieldSchemaResult<Output>>;
    readonly types?: { readonly input: unknown; readonly output: Output };
  };
}
export interface FieldIssue {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>;
  readonly severity?: 'error' | 'warning';
}
export type FieldSchemaResult<T = unknown> =
  | { readonly value: T; readonly issues?: undefined }
  | { readonly issues: readonly FieldIssue[] };
export interface FieldRequest<Context = unknown> {
  raw: string;
  value: string | null;
  context: Context;
  signal: AbortSignal;
}
export interface FieldResult<Output = unknown> {
  output?: Output;
  issues: readonly FieldIssue[];
}
export interface FieldValidation {
  schema?: FieldSchema;
  parse?: (raw: string, request: FieldRequest) => unknown | Promise<unknown>;
  normalize?: (value: unknown, request: FieldRequest) => unknown | Promise<unknown>;
  validator?: (value: unknown, request: FieldRequest) => Partial<FieldResult> | Promise<Partial<FieldResult>>;
  issues?: readonly FieldIssue[];
}
export interface FieldSelection { start: number; end: number; direction?: 'forward' | 'backward' | 'none' }
export interface FieldFormat { display: string; selection: FieldSelection }
export type FieldFormatter = (raw: string, selection: FieldSelection) => FieldFormat | undefined;

/** Formatting is additive: every original character must survive in order.
 * Normalization belongs to submitted output, never the visible editing buffer. */
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
