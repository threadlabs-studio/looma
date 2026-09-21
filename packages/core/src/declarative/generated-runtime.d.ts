/** One compiled prop: the value the caller supplied (undefined when omitted), its declared default, and whether the template binds its data-* attribute. */
export interface GeneratedProp {
  readonly name: string;
  readonly attribute: string;
  readonly value: unknown;
  readonly default?: unknown;
  readonly bound?: boolean;
  readonly type: string | readonly unknown[];
  readonly required: boolean;
}
/** Reflects explicit props as data-* attributes and parses later attribute writes, for the lifetime of a native root. */
export declare function manageGeneratedProps(element: Element, props: readonly GeneratedProp[], apply?: (name: string, value: unknown) => void): () => void;
/** Framework-adapter prop channel for compiled components: applies props as authored attributes would be. */
export declare function updateGeneratedProps(element: Element, props: Readonly<Record<string, unknown>>): void;
