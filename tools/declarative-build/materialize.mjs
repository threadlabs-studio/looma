import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { compileScript, parse } from "@vue/compiler-sfc";

import { generateVueComponentTypes } from "../scripts/generate-vue-component-types.mjs";
import {
  preserveVueOptionalBooleanAbsence,
  preserveVueSlotRegions,
} from "./framework-adoption.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPOSITORY = join(HERE, "..", "..");
const SOURCE_ROOTS = Object.freeze({
  core: join(REPOSITORY, "packages", "core", "src", "declarative"),
  layout: join(REPOSITORY, "packages", "layout", "src", "declarative"),
  editor: join(REPOSITORY, "packages", "editor", "src", "declarative"),
});
// Each component is one folder: components/<tag>/<tag>.html, its controller <tag>.js, and examples/.
const componentRoot = (group) => join(REPOSITORY, "packages", group, "src", "components");
const definitionPath = (group, tag) => join(componentRoot(group), tag, `${tag}.html`);
const RELEASE_CLASSIFICATIONS = JSON.parse(await readFile(
  join(REPOSITORY, "tools", "data", "component-release-classification.json"),
  "utf8",
)).tags;
const registryOnly = process.argv.includes("--registry-only");
const compiledArgument = process.argv.find((argument) => argument.startsWith("--compiled-dir="));
if (!compiledArgument && !registryOnly) {
  throw new Error("Pass --compiled-dir=<official HTML Next build output> when generating framework adapters.");
}
const COMPILED = compiledArgument
  ? join(process.cwd(), compiledArgument.slice("--compiled-dir=".length))
  : undefined;

const groups = { core: [], layout: [], editor: [] };
if (COMPILED) {
  const manifest = JSON.parse(await readFile(join(COMPILED, "html.manifest.json"), "utf8"));
  for (const component of manifest.components) {
    const match = component.source.match(/packages\/(core|layout|editor)\/src\/components\//);
    if (!match) throw new Error(`${component.tag}: cannot determine Looma package from ${component.source}`);
    groups[match[1]].push(component);
  }
} else {
  for (const group of Object.keys(SOURCE_ROOTS)) {
    const folders = (await readdir(componentRoot(group))).filter((name) => name.startsWith("ui-")).sort();
    for (const tag of folders) {
      const files = new Set(await readdir(join(componentRoot(group), tag)));
      groups[group].push({ tag, controller: files.has(`${tag}.js`) ? `${tag}.js` : undefined });
    }
  }
}

function rewriteFrameworkSource(source, component) {
  // The upstream compiler emits adapters for its package names and includes a
  // controller import beside every generated component. Looma centralizes
  // controller modules in the registered package graph, so adapters resolve
  // them by tag instead of bundling a private copy per framework component.
  return source
    .replace(/import \{ attachComponent, updateComponentProps \} from "@nextwebwg\/declarative-components\/runtime";\n/, `import { attachLoomaComponent, updateComponentProps } from "@threadlabs/looma-core/declarative";\n`)
    .replace(/import \{ ((?:dispatchGeneratedEvent, )?manageGeneratedProps, updateGeneratedProps) \} from "@nextwebwg\/declarative-components\/generated-runtime";\n/, `import { $1 } from "@threadlabs/looma-core/declarative-generated";\n`)
    .replace(/import type \{ ComponentDefinition \} from "@nextwebwg\/declarative-components";\n/, `import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";\n`)
    .replace(new RegExp(`import \\* as controller from "\\.\\.\/controllers\/${component.tag}\/(?:controllers\/|${component.tag}\/)?${component.tag}\\.js";\\n`), "")
    .replace(new RegExp(`import "\\.\\.\/styles\/${component.tag}\\.css";\\n`), "")
    // Declarative nullable values mean "attribute absent". React's intrinsic
    // attribute types express that absence as undefined rather than null.
    .replace(/\b([\w:-]+)=\{(prop\d+)\}/g, "$1={$2 ?? undefined}")
    .replace(/\)\[("[^"]+")\]\(\)/g, ")[$1]!()")
    .replace(
      /attachComponent\((root\.(?:value|current)), definition, \{\s*props(?:: (componentProps|explicitProps\(\)))?,\s*controller,\s*\}\)/g,
      (_match, root, explicitProps) => `attachLoomaComponent(${root}, definition, "${component.tag}", ${explicitProps ?? "props"})`,
    );
}

function rewriteNestedComponents(source, component, components, framework) {
  // Generated templates can contain other declarative components. Replacing
  // their invocation tags with generated framework components ensures the
  // framework owns the whole rendered subtree and gives each nested root its
  // own lifecycle. Leaving raw tags here would split ownership between the
  // framework reconciler and the document observer.
  const dependencies = components.filter(({ tag }) => tag !== component.tag && source.includes(`<${tag}`));
  if (dependencies.length === 0) return source;
  for (const dependency of dependencies) {
    source = source
      .replaceAll(`<${dependency.tag}`, `<${dependency.name}`)
      .replaceAll(`</${dependency.tag}>`, `</${dependency.name}>`);
    if (framework === "react") {
      source = source.replace(new RegExp(`<${dependency.name}([^>]*?)\\bhtmlFor=`, "g"), `<${dependency.name}$1for=`);
    }
  }
  const imports = dependencies.map(({ name }) => framework === "vue"
    ? `import ${name} from "./${name}";`
    : `import { ${name} } from "./${name}";`).join("\n");
  return framework === "vue"
    ? source.replace(/(<script setup lang="ts">\n)/, `$1${imports}\n`)
    : source.replace(/(import type \{[^\n]+\} from "react";\n)/, `$1${imports}\n`);
}

function forceVueManagedRootFullDiff(source, component, definitionSource) {
  if (!/\$(?:if|each|with|match)(?:=|\s|>)/.test(definitionSource)) return source;
  const optimizedRootFlag = "16 /* FULL_PROPS */";
  const occurrences = source.split(optimizedRootFlag).length - 1;
  if (occurrences !== 1) {
    throw new Error(`${component.tag}: expected one optimized Vue root, found ${occurrences}.`);
  }
  // The declarative runtime adopts framework-owned roots in place. Vue's
  // block-level dynamic-child optimization assumes no other runtime has walked
  // that tree, so a later conditional insert can pair the following slot
  // regions with the wrong siblings. Bail out at the generated root to make Vue
  // reconcile the actual structure while preserving its slot and flow anchors.
  return source.replace(optimizedRootFlag, "-2 /* BAIL */");
}

function rewriteReactSemantics(source, definitionSource) {
  // Property-only values are assigned after mount by manageGeneratedProps.
  // Passing them through JSX would serialize unknown native attributes and can
  // stringify objects/functions. The definition, not Stencil metadata, decides
  // which bindings use the property channel.
  const propertyNames = [...definitionSource.matchAll(/\s\.([\w-]+)=/g)].map((match) => match[1]);
  for (const propertyName of new Set(propertyNames)) {
    source = source.replace(new RegExp(`\\s${propertyName}=\\{prop\\d+(?: \\?\\? undefined)?\\}`, "gi"), "");
  }
  return source
    // React spells the HTML `readonly` attribute `readOnly`, while TypeScript's
    // `readonly` type modifier must remain untouched. The first replacement
    // adapts the public prop destructure; the second targets JSX attributes.
    .replace(/^  readonly\?:/gm, "  readOnly?:")
    .replace(/"readonly": (prop\d+)/, '"readOnly": $1')
    // Raw (explicit-only) prop reads use the React-spelled key; the runtime prop stays `readonly`.
    .replace(/props\["readonly"\]/g, 'props["readOnly"]')
    .replace(/\sreadonly=\{/g, " readOnly={")
    .replace(/\shidden=""/g, " hidden")
    .replace(/\stabindex="(-?\d+)"/g, " tabIndex={$1}")
    .replace(/(^|\s)autocomplete=/gm, "$1autoComplete=");
}

async function materializeRegistry(group, components, outputDirectory) {
  const imports = [];
  const records = [];
  for (const [index, component] of components.entries()) {
    let controller = "undefined";
    if (component.controller) {
      const name = `controller${index}`;
      imports.push(`import * as ${name} from "../components/${component.tag}/${component.tag}.js";`);
      controller = name;
    }
    const definition = (await readFile(definitionPath(group, component.tag), "utf8"))
      .replace(/^<link\s+rel="component"[^>]*>\s*$/gm, "");
    records.push(`  { tag: ${JSON.stringify(component.tag)}, source: ${JSON.stringify(definition)}, controller: ${controller} },`);
  }
  // Core definitions carry their component styles inline, so the runtime
  // installs them while registering the declarative graph. Layout and editor
  // styles are package-level resources and remain explicit adoption assets.
  // Keeping this difference here—rather than in consumers—lets all entry points
  // share one record shape and prevents CSS ownership from leaking into adapters.
  const styles = group === "core"
    ? ""
    : await readFile(join(SOURCE_ROOTS[group], "styles.css"), "utf8");
  const source = `${imports.join("\n")}\n\nexport const records = [\n${records.join("\n")}\n];\nexport const styles = ${JSON.stringify(styles)};\n`;
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(join(outputDirectory, "registry.js"), source);
  await writeFile(join(outputDirectory, "registry.d.ts"), [
    "export interface AdoptionRecord {",
    "  readonly tag: string;",
    "  readonly source: string;",
    "  readonly controller?: { readonly default?: (host: unknown) => void | (() => void) };",
    "}",
    "export declare const records: readonly AdoptionRecord[];",
    "export declare const styles: string;",
    "",
  ].join("\n"));
}

async function materializeReact(components) {
  const output = join(REPOSITORY, "packages", "react", "src", "generated");
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const exports = [];
  for (const component of components) {
    const group = groups.core.includes(component) ? "core" : groups.layout.includes(component) ? "layout" : "editor";
    const definitionSource = await readFile(definitionPath(group, component.tag), "utf8");
    const source = rewriteReactSemantics(rewriteNestedComponents(rewriteFrameworkSource(
      await readFile(join(COMPILED, "react", `${component.name}.tsx`), "utf8"),
      component,
    ), component, components, "react"), definitionSource);
    await writeFile(join(output, `${component.name}.tsx`), source);
    const publicName = component.name.replace(/^Ui/, "");
    exports.push(`export { ${component.name} as ${publicName}, type ${component.name}Props as ${publicName}Props, type ${component.name}Handle as ${publicName}Handle } from "./${component.name}";`);
  }
  await writeFile(join(output, "index.ts"), `${exports.join("\n")}\n`);
}

async function materializeVue(components) {
  const output = join(REPOSITORY, "packages", "vue", "src", "generated");
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const exports = [];
  for (const component of components) {
    const group = groups.core.includes(component) ? "core" : groups.layout.includes(component) ? "layout" : "editor";
    const definitionSource = await readFile(definitionPath(group, component.tag), "utf8");
    const rewritten = preserveVueSlotRegions(rewriteNestedComponents(rewriteFrameworkSource(
      await readFile(join(COMPILED, "vue", `${component.name}.vue`), "utf8"),
      component,
    ), component, components, "vue"));
    const { descriptor, errors } = parse(rewritten, { filename: `${component.name}.vue` });
    if (errors.length) throw errors[0];
    const compiled = compileScript(descriptor, { id: `looma-${component.tag}`, inlineTemplate: true });
    const source = preserveVueOptionalBooleanAbsence(
      forceVueManagedRootFullDiff(compiled.content, component, definitionSource),
      definitionSource,
    );
    await writeFile(join(output, `${component.name}.ts`), `${source}\n`);
    exports.push(`export { default as ${component.name} } from "./${component.name}";`);
  }
  await writeFile(join(output, "index.ts"), `${exports.join("\n")}\n`);
}

async function materializeVanilla(components) {
  const output = join(REPOSITORY, "packages", "svelte", "src", "generated", "vanilla");
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const imports = [];
  const names = [];
  const factoryEntries = [];
  const declarations = [
    "/** Inputs accepted by generated DOM factories before lifecycle attachment. */",
    "export interface VanillaComponentOptions {",
    "  readonly attributes?: Readonly<Record<string, string | number | boolean | null | undefined>>;",
    "  readonly children?: readonly Node[];",
    "  readonly slots?: Readonly<Record<string, readonly Node[]>>;",
    "  readonly [name: string]: unknown;",
    "}",
    "",
  ];
  for (const component of components) {
    let source = await readFile(join(COMPILED, "vanilla", `${component.name}.js`), "utf8");
    source = source
      .replace(/import \{ manageComponentLifecycle \} from "@nextwebwg\/declarative-components\/runtime";\n/, `import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";\n`)
      .replace(/import \{ manageGeneratedProps \} from "@nextwebwg\/declarative-components\/generated-runtime";\n/, `import { manageGeneratedProps } from "@threadlabs/looma-core/declarative-generated";\n`)
      .replace(new RegExp(`import \\* as controller from "\\.\\.\/controllers\/${component.tag}\/(?:controllers\/|${component.tag}\/)?${component.tag}\\.js";\\n`), "")
      .replace(new RegExp(`import "\\.\\.\/styles\/${component.tag}\\.css";\\n`), "")
      .replace(
        /manageComponentLifecycle\(element, definition, \{\s*props: componentProps,\s*controller,\s*\}\);/g,
        `attachLoomaComponent(element, definition, "${component.tag}", componentProps);`,
      );
    await writeFile(join(output, `${component.name}.js`), source);
    imports.push(`import { create${component.name} } from "./${component.name}.js";`);
    names.push(`create${component.name}`);
    factoryEntries.push(`  ${JSON.stringify(component.tag)}: create${component.name},`);
    declarations.push(`export declare function create${component.name}(options?: VanillaComponentOptions): HTMLElement;`);
  }
  await writeFile(join(output, "index.js"), [
    imports.join("\n"),
    `export { ${names.join(", ")} };`,
    "export const factoryByTag = Object.freeze({",
    factoryEntries.join("\n"),
    "});",
    "",
  ].join("\n"));
  declarations.push(
    "",
    `export type GeneratedTagName = ${components.map(({ tag }) => JSON.stringify(tag)).join(" | ")};`,
    "export declare const factoryByTag: Readonly<Record<GeneratedTagName, (options?: VanillaComponentOptions) => HTMLElement>>;",
  );
  await writeFile(join(output, "index.d.ts"), `${declarations.join("\n")}\n`);
}

async function main() {
  const outputArgument = process.argv.find((argument) => argument.startsWith("--output="));
  const output = outputArgument ? join(process.cwd(), outputArgument.slice("--output=".length)) : undefined;
  const registryDirectory = (group) => output ? join(output, group) : SOURCE_ROOTS[group];
  if (registryOnly) {
    for (const [group, components] of Object.entries(groups)) {
      await materializeRegistry(group, components, registryDirectory(group));
    }
    console.log(`Refreshed ${Object.values(groups).flat().length} declarative registry records without regenerating framework adapters.`);
    return;
  }
  if (output) await rm(output, { recursive: true, force: true });
  for (const [group, components] of Object.entries(groups)) {
    await materializeRegistry(group, components, registryDirectory(group));
  }

  const runtimeOutput = output ?? SOURCE_ROOTS.core;
  await mkdir(runtimeOutput, { recursive: true });

  const runtimeSource = await readFile(join(HERE, "vendor", "html-next-runtime.iife.js"), "utf8");
  const runtime = runtimeSource
    // The vendored upstream runtime owns hydration and slot reconciliation.
    // Looma only exposes the IIFE's public API as ESM; release tooling must not
    // patch runtime internals or carry a private framework-specific fork.
    .replace('"use strict";var HtmlRuntime=', "const HtmlRuntime=")
    .concat("\nexport const { attachComponent, attachRegisteredComponent, getComponentHost, installComponentGraph, lowerDocument, manageComponentLifecycle, observeDocument, registerComponentDefinitions, serializeRenderedForm, setControllerModule, updateComponentProps } = HtmlRuntime;\n");
  await writeFile(join(runtimeOutput, "runtime.js"), runtime);
  await writeFile(join(runtimeOutput, "runtime.d.ts"), [
    "/** Binds props, behavior, and teardown to a root whose DOM is owned by a framework adapter. */",
    "export declare function attachComponent(element: Element, definition: unknown, options?: { props?: Record<string, unknown>; controller?: unknown }): () => void;",
    "/** Uses the package registry so adapters do not bundle or import private definition objects. */",
    "export declare function attachRegisteredComponent(element: Element, tag: string, options?: { props?: Record<string, unknown>; controller?: unknown }): () => void;",
    "/** Returns the framework-neutral host facade; controllers must not depend on invocation elements. */",
    "export declare function getComponentHost(element: Element): unknown;",
    "export declare function installComponentGraph(...args: unknown[]): unknown;",
    "/** Performs the initial lowering pass before mutation observation begins. */",
    "export declare function lowerDocument(root?: Document): unknown;",
    "/** Connects behavior only while the root participates in the document. */",
    "export declare function manageComponentLifecycle(element: Element, definition: unknown, options?: { props?: Record<string, unknown>; controller?: unknown }): () => void;",
    "/** Owns incremental lowering until its returned disposer is called. */",
    "export declare function observeDocument(root?: Document, options?: { shouldLower?: (element: Element, definition: { contract: { tag: string } }, hydration: boolean) => boolean; onConnect?: (element: Element, definition: { contract: { tag: string } }) => void | (() => void); onError?: (error: unknown) => void }): () => void;",
    "export declare function registerComponentDefinitions(definitions: readonly unknown[], root?: Document): void;",
    "/** Serializes lowered components as their rendered form: slot range markers plus a carrier for projected content no slot renders. */",
    "export declare function serializeRenderedForm(container: Element): string;",
    "/** Associates behavior with one settled root without publishing modules on a browser global. */",
    "export declare function setControllerModule(element: Element, module: Promise<unknown>): void;",
    "/** Framework-adapter prop channel: applies props as authored attributes would be. */",
    "export declare function updateComponentProps(element: Element, props: Readonly<Record<string, unknown>>): void;",
    "",
  ].join("\n"));
  await cp(join(HERE, "vendor", "html-next-generated-runtime.js"), join(runtimeOutput, "generated-runtime.js"));
  await writeFile(join(runtimeOutput, "generated-runtime.d.ts"), [
    "/** One compiled prop: the value the caller supplied (undefined when omitted), its declared default, and whether the template binds its data-* attribute. */",
    "export interface GeneratedProp {",
    "  readonly name: string;",
    "  readonly attribute: string;",
    "  readonly value: unknown;",
    "  readonly default?: unknown;",
    "  readonly bound?: boolean;",
    "  readonly type: string | readonly unknown[];",
    "  readonly required: boolean;",
    "}",
    "/** Reflects explicit props as data-* attributes and parses later attribute writes, for the lifetime of a native root. */",
    "export declare function manageGeneratedProps(element: Element, props: readonly GeneratedProp[], apply?: (name: string, value: unknown) => void): () => void;",
    "/** Framework-adapter prop channel for compiled components: applies props as authored attributes would be. */",
    "export declare function updateGeneratedProps(element: Element, props: Readonly<Record<string, unknown>>): void;",
    "",
  ].join("\n"));

  const allComponents = Object.values(groups).flat();
  const publicComponents = allComponents.filter(({ tag }) => RELEASE_CLASSIFICATIONS[tag]?.status === "published");
  await materializeReact(publicComponents);
  await materializeVue(publicComponents);
  await materializeVanilla(publicComponents);
  await writeFile(
    join(REPOSITORY, "packages", "vue", "src", "generated-component-types.ts"),
    await generateVueComponentTypes(),
  );
  console.log(
    `Materialized ${allComponents.length} package-owned components in ${relative(REPOSITORY, runtimeOutput)} `
      + `plus ${publicComponents.length} published release adapters.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
