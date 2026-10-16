declare module "*.css";

// Vite's eager raw glob, as Looma Markdown's fixtures use it.
interface ImportMeta {
  glob<T>(pattern: string, options: { query: "?raw"; import: "default"; eager: true }): Record<string, T>;
}
