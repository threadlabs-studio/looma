export interface AdoptionRecord {
  readonly tag: string;
  readonly source: string;
  readonly controller?: { readonly default?: (host: unknown) => void | (() => void) };
}
export declare const records: readonly AdoptionRecord[];
export declare const styles: string;
