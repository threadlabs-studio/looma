/**
 * A state prop is controlled only when the consumer supplies a value.
 *
 * Truthiness cannot represent this boundary: `false`, `0`, an empty string,
 * and `null` can all be intentional controlled values. Looma reserves only
 * `undefined` for "the owner omitted this prop" across native and framework
 * adapters.
 */
export const isControlled = <T>(value: T | undefined): value is T => value !== undefined;

/**
 * Resolves initial/effective state without erasing explicit falsey values.
 * Defaults apply only when a corresponding controlled prop is omitted.
 */
export const controlledOrDefault = <T>(value: T | undefined, defaultValue: T): T =>
  value === undefined ? defaultValue : value;
