import type { GenericSchema, GenericSchemaAsync, InferOutput } from 'valibot';
import type { FieldSchema, FieldValidation } from './validation';

/** Valibot's Standard Schema implementation preserves async transforms and issue paths.
 * Type-only Valibot imports keep the adapter free of a schema-library runtime. */
export function valibotField<T extends GenericSchema | GenericSchemaAsync>(
  schema: T,
  options: Omit<FieldValidation, 'schema'> = {},
): FieldValidation & { schema: FieldSchema<InferOutput<T>> } {
  return { ...options, schema };
}
