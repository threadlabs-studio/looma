/** Metadata that preserves defaults and property-only values without forcing attribute serialization. */
export interface GeneratedProp {
  readonly name: string;
  readonly attribute: string;
  readonly value: unknown;
  readonly type: string | readonly unknown[];
  readonly required: boolean;
}
/** Synchronizes property and attribute writes for the lifetime of a native root. */
export declare function manageGeneratedProps(element: Element, props: readonly GeneratedProp[], apply?: (name: string, value: unknown) => void): () => void;
