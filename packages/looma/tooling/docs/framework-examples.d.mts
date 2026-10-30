export type Framework = 'html-next' | 'vue' | 'react' | 'svelte';
export interface FrameworkExample { language: 'html' | 'vue' | 'tsx' | 'svelte'; code: string; }
export const frameworkLabels: Readonly<Record<Framework, string>>;
export function frameworkExamples(
  example: { markup: string; frameworks?: Partial<Record<Framework, FrameworkExample>> },
  components: readonly { tag: string; package: string; resource?: string; attributes?: readonly { name: string; property?: string; type?: string }[] }[],
): Record<Framework, FrameworkExample>;
