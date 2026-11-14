declare module "*.css";

declare module "parse-srcset" {
  export default function parse(input: string): { url: string; w?: number; h?: number; d?: number }[];
}

// Vite's eager raw glob, as Looma Markdown's fixtures use it.
interface ImportMeta {
  glob<T>(pattern: string, options: { query: "?raw"; import: "default"; eager: true }): Record<string, T>;
}
