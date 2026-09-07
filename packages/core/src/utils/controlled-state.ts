/** A state prop is controlled only when the consumer supplies a value. */
export const isControlled = <T>(value: T | undefined): value is T => value !== undefined;

/** Defaults apply only when a corresponding controlled prop is omitted. */
export const controlledOrDefault = <T>(value: T | undefined, defaultValue: T): T =>
  value === undefined ? defaultValue : value;
