export interface GeneratedProp {
  readonly name: string;
  readonly attribute: string;
  readonly value: unknown;
  readonly type: string | readonly unknown[];
  readonly required: boolean;
}
export declare function manageGeneratedProps(element: Element, props: readonly GeneratedProp[], apply?: (name: string, value: unknown) => void): () => void;
