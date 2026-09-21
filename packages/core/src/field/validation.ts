/**
 * Renderable validation problem, optionally located within structured input.
 * Warning severity preserves accepted output; omitted severity is an error.
 */
export interface FieldIssue {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>;
  readonly severity?: 'error' | 'warning';
}
