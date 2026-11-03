import type { TypeNode } from '@nextwebwg/html-next';

export type Framework = 'html-next' | 'vue' | 'react' | 'preact' | 'svelte' | 'angular';
export interface FrameworkExample { language: 'html' | 'vue' | 'tsx' | 'svelte' | 'text'; code: string; notice?: string; }
export const frameworkLabels: Readonly<Record<Framework, string>>;
export function frameworkExamples(
  example: { markup: string; frameworks?: Partial<Record<Framework, FrameworkExample>> },
  components: readonly { tag: string; package: string; root?: string; resource?: string; importSource?: string; attributes?: readonly { name: string; property?: string; type?: string; valueType?: TypeNode }[] }[],
): Record<Framework, FrameworkExample>;
