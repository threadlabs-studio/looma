import type { GenericSchema, GenericSchemaAsync, InferOutput } from 'valibot';
import type { FieldSchema, FieldValidation } from './validation';

/**
 * Adapts a Valibot schema to Looma's field-validation boundary.
 *
 * Valibot's Standard Schema implementation preserves async transforms and issue
 * paths. Type-only Valibot imports keep the adapter free of a schema-library
 * runtime.
 *
 * @contract The supplied schema is retained unchanged under the Standard Schema
 * slot, while all other validation options pass through without reinterpretation.
 */
export function valibotField<T extends GenericSchema | GenericSchemaAsync>(
  schema: T,
  options: Omit<FieldValidation, 'schema'> = {},
): FieldValidation & { schema: FieldSchema<InferOutput<T>> } {
  return { ...options, schema };
}
