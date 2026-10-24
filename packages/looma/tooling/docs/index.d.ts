export interface DocumentationGroup { id: string; label: string }
export interface ExampleCode { language: string; code: string }
export interface DocumentationExample {
  id: string; name: string; title: string; description: string; markup: string;
  resizable: boolean; frameworks: Record<string, ExampleCode>; behavior?: string; bindings?: string;
}
export interface DocumentationComponent {
  id: string; package: string; tag: string; title: string; description: string; group: string;
  root: string; resource: string; source?: string; navigationParent?: string;
  targets: string[]; examples: DocumentationExample[];
  attributes: Record<string, unknown>[]; properties: Record<string, unknown>[];
  events: Record<string, unknown>[]; slots: Record<string, unknown>[];
  designTokens: { sources?: string[]; component: Record<string, unknown>[]; shared: Record<string, unknown>[] };
}
export interface DocumentationCatalog {
  schemaVersion: 1; package?: string; version?: string; groups: DocumentationGroup[];
  resources?: { tag: string; package: string; resource: string }[]; components: DocumentationComponent[];
}
export interface DiscoveryRoot { directory: string; packageName: string; groups?: DocumentationGroup[] }
export interface ThemeRecipe { schemaVersion: 1; values: Record<string, string> }
export interface ThemeField { family: string; id: string; label: string; property: string; type: string; defaultValue: string; description: string }
export interface DocumentationConfiguration {
  title?: string; base?: string; origin?: string; outDir?: string; content?: string;
  logo?: string | { light: string; dark?: string }; nav?: { label: string; href: string }[];
  components?: DiscoveryRoot[]; catalogs?: string[]; categories?: Record<string, string>;
  theme?: { recipe?: string; css?: string }; overrides?: string[];
  recipe?: ThemeRecipe;
}
export interface DocumentationInput { root?: string; config?: DocumentationConfiguration; catalog?: DocumentationCatalog }
export interface DocumentationSite {
  root: string; config: DocumentationConfiguration; base: string; catalog: DocumentationCatalog;
  examples: (DocumentationExample & { file: string; component: string; path: string })[];
  generated: string; content: string; previews: string; redirects: Record<string, string>;
}
export interface DocumentationBuild { outDir: string; routes: readonly string[]; browserInputs: readonly string[]; site: DocumentationSite }
export interface DocumentationServer { url: string; close(): Promise<void> }
export function readCatalog(specifier?: string | URL): Promise<DocumentationCatalog>;
export function discoverComponents(input: DiscoveryRoot & { root: string }): Promise<DocumentationCatalog>;
export function mergeCatalogs(catalogs: DocumentationCatalog[], options?: { categories?: Record<string, string> }): DocumentationCatalog;
export function prepareDocumentation(input: DocumentationInput & { root: string }): Promise<DocumentationSite>;
export function buildDocumentation(input?: DocumentationInput): Promise<DocumentationBuild>;
/** Optional HTMLKit integration; server tooling peers are loaded only when invoked. */
export function documentationOptions(site: DocumentationSite): Promise<import('@nextwebwg/htmlkit').ApplicationOptions>;
export function documentationPlugin(site: DocumentationSite): import('@nextwebwg/htmlkit').HtmlKitPlugin;
export function initializeDocumentation(input?: { root?: string; title?: string }): Promise<{ config: DocumentationConfiguration; files: string[]; applicationImport: string }>;
export function readConfiguration(root?: string): Promise<{ root: string; config: DocumentationConfiguration }>;
export function buildProjectDocumentation(input?: DocumentationInput): Promise<DocumentationBuild>;
export function devProjectDocumentation(input?: DocumentationInput & { port?: number; onError?: (error: unknown) => void }): Promise<DocumentationServer>;
export function previewProjectDocumentation(input?: DocumentationInput & { port?: number }): Promise<DocumentationServer>;
export const themeFields: readonly ThemeField[];
export const startingPoints: Record<string, ThemeRecipe>;
export function defaultRecipe(): ThemeRecipe;
export function validateRecipe(input: unknown): ThemeRecipe;
export function themeCSS(input: ThemeRecipe, systemCSS?: string): string;
