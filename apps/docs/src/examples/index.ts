import type { FrameworkExamples } from "../components/FrameworkMode";
import type { ScenarioPropertyAssignment } from "../components/ComponentModeExample";

/**
 * Component examples live beside their component, one real HTML file per example:
 * `packages/<package>/src/components/<tag>/examples/NN-slug.html`.
 * A leading comment carries the example's metadata:
 *
 *   <!--
 *   title: Default
 *   description: What this example shows.
 *   bind: items=mentionItems      (optional: attribute → variable name in framework examples)
 *   preview: resizable            (optional: the preview gets a width slider)
 *   -->
 *
 * Whitespace between tags is formatting only; it is removed before the markup is rendered.
 *
 * Siblings with the same base name add hand-written code for a mode (`.snippet.html`, `.vue`,
 * other modes are derived from the markup) or demo behaviour
 * (`.behavior.ts`, a function given the example's rendered root).
 */
export interface ComponentExample {
  readonly tag: string;
  readonly name: string;
  readonly title: string;
  readonly description: string;
  /** The HTML to render and show, with structured values written as attributes. */
  readonly markup: string;
  /** The markup without bound attributes, and the values framework examples bind as variables. */
  readonly frameworkMarkup: string;
  readonly assignments: readonly ScenarioPropertyAssignment[];
  /** Hand-written code for some modes; the others are derived from the markup. */
  readonly frameworks?: Partial<FrameworkExamples>;
  readonly resizable: boolean;
  readonly behavior?: (root: HTMLElement) => () => void;
}

interface WebpackContext {
  keys(): string[];
  (id: string): unknown;
}
// webpack's require.context. Webpack only recognises the literal `require.context(...)` call.
declare global {
  interface NodeRequire {
    context(directory: string, recursive: boolean, pattern: RegExp): WebpackContext;
  }
}

// Example sources are loaded as text (see the looma-examples plugin in docusaurus.config.ts).
// One context over the components folder (a context over packages/ would also crawl node_modules).
const sourceContexts = [
  require.context("../../../../packages/looma/src/components", true, /\/examples\/[^/]+\.(html|vue)$/),
];
const behaviorContexts = [
  require.context("../../../../packages/looma/src/components", true, /\/examples\/[^/]+\.behavior\.ts$/),
];

/** Every file in the contexts, by its path below `components/`. */
function files(contexts: readonly WebpackContext[]): Map<string, unknown> {
  return new Map(contexts.flatMap((context) => context.keys().map((key) => [key, context(key)] as const)));
}

const frameworkExtensions = { "html-next": ".snippet.html", vue: ".vue" } as const;
const frameworkLanguages = { "html-next": "html", vue: "vue" } as const;

const text = (module: unknown): string =>
  typeof module === "string" ? module : String((module as { default?: unknown }).default ?? "");

function metadata(source: string): { fields: Map<string, string>; markup: string } {
  const match = /^<!--\n([\s\S]*?)\n-->\n/.exec(source);
  if (!match) throw new Error("A component example must start with its metadata comment.");
  const fields = new Map<string, string>();
  for (const line of match[1]!.split("\n")) {
    const separator = line.indexOf(":");
    if (separator > 0) fields.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }
  return { fields, markup: source.slice(match[0].length).trim().replace(/>\s+</g, "><") };
}

const decode = (value: string) => value.replaceAll("&#39;", "'").replaceAll("&quot;", '"').replaceAll("&amp;", "&");
const camel = (name: string) => name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

/** Splits `attribute=variable` bindings out of the markup, recovering each attribute's JSON value. */
function bindings(markup: string, spec: string | undefined): { frameworkMarkup: string; assignments: ScenarioPropertyAssignment[] } {
  const assignments: ScenarioPropertyAssignment[] = [];
  let frameworkMarkup = markup;
  for (const pair of (spec ?? "").split(/\s+/).filter(Boolean)) {
    const [attribute, variable] = pair.split("=");
    const tag = new RegExp(`<[^>]*\\s${attribute}='([^']*)'[^>]*>`).exec(frameworkMarkup);
    const elementId = tag ? /\sid="([^"]+)"/.exec(tag[0])?.[1] : undefined;
    if (!tag || !elementId || !variable) throw new Error(`bind "${pair}" does not match an element with an id.`);
    assignments.push({ elementId, property: camel(attribute!), variable, value: JSON.parse(decode(tag[1]!)) });
    frameworkMarkup = frameworkMarkup.replace(tag[0], tag[0].replace(` ${attribute}='${tag[1]}'`, ""));
  }
  return { frameworkMarkup, assignments };
}

function load(): Map<string, ComponentExample[]> {
  const byTag = new Map<string, ComponentExample[]>();
  const sources = files(sourceContexts);
  const behaviors = files(behaviorContexts);
  for (const key of Array.from(sources.keys()).filter((path) => path.endsWith(".html")).sort()) {
    // Example files are `NN-slug.html`; dotted names (`.snippet.html`) are siblings, not examples.
    const [, tag, name] = /^\.\/([^/]+)\/examples\/([^/.]+)\.html$/.exec(key) ?? [];
    if (!tag || !name) continue;
    const { fields, markup } = metadata(text(sources.get(key)));
    const { frameworkMarkup, assignments } = bindings(markup, fields.get("bind"));
    const frameworks: Partial<Record<keyof typeof frameworkExtensions, { language: string; code: string }>> = {};
    for (const [framework, extension] of Object.entries(frameworkExtensions) as [keyof typeof frameworkExtensions, string][]) {
      const sibling = sources.get(`./${tag}/examples/${name}${extension}`);
      if (sibling !== undefined) frameworks[framework] = { language: frameworkLanguages[framework], code: text(sibling).trimEnd() };
    }
    const behavior = (behaviors.get(`./${tag}/examples/${name}.behavior.ts`) as
      { default: (root: HTMLElement) => () => void } | undefined)?.default;
    const example: ComponentExample = {
      tag,
      name,
      title: fields.get("title") ?? name,
      description: fields.get("description") ?? "",
      markup,
      frameworkMarkup,
      assignments,
      resizable: fields.get("preview") === "resizable",
      ...(Object.keys(frameworks).length > 0 ? { frameworks: frameworks as Partial<FrameworkExamples> } : {}),
      ...(behavior ? { behavior } : {}),
    };
    byTag.set(tag, [...(byTag.get(tag) ?? []), example]);
  }
  return byTag;
}

const examples = load();

/** The examples for one component, in file order. */
export function examplesFor(tag: string): readonly ComponentExample[] {
  return examples.get(tag) ?? [];
}
