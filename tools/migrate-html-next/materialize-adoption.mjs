import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { compileScript, parse } from "@vue/compiler-sfc";

import {
  preserveVueOptionalBooleanAbsence,
  preserveVueSlotRegions,
} from "./framework-adoption.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPOSITORY = join(HERE, "..", "..");
const DEFAULT_OUTPUT = join(HERE, "generated", "adoption");
const compiledArgument = process.argv.find((argument) => argument.startsWith("--compiled-dir="));
if (!compiledArgument) throw new Error("Pass --compiled-dir=<official HTML Next build output>.");
const COMPILED = join(process.cwd(), compiledArgument.slice("--compiled-dir=".length));

const manifest = JSON.parse(await readFile(join(COMPILED, "html.manifest.json"), "utf8"));
const groups = { core: [], layout: [], editor: [] };
for (const component of manifest.components) {
  const match = component.source.match(/generated\/(core|layout|editor)\//);
  if (!match) throw new Error(`${component.tag}: cannot determine Looma package from ${component.source}`);
  groups[match[1]].push(component);
}

function rewriteFrameworkSource(source, component) {
  return source
    .replace(/import \{ attachComponent \} from "@nextwebwg\/declarative-components\/runtime";\n/, `import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";\n`)
    .replace(/import \{ manageGeneratedProps \} from "@nextwebwg\/declarative-components\/generated-runtime";\n/, `import { manageGeneratedProps } from "@threadlabs/looma-core/declarative-generated";\n`)
    .replace(/import type \{ ComponentDefinition \} from "@nextwebwg\/declarative-components";\n/, `import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";\n`)
    .replace(new RegExp(`import \\* as controller from "\\.\\.\/controllers\/${component.tag}\/controllers\/${component.tag}\\.js";\\n`), "")
    .replace(new RegExp(`import "\\.\\.\/styles\/${component.tag}\\.css";\\n`), "")
    .replace(
      `data-component-root="${component.tag}"`,
      `data-component-root="${component.tag}" data-looma-managed="framework"`,
    )
    // Declarative nullable values mean "attribute absent". React's intrinsic
    // attribute types express that absence as undefined rather than null.
    .replace(/\b([\w:-]+)=\{(prop\d+)\}/g, "$1={$2 ?? undefined}")
    .replace(/\)\[("[^"]+")\]\(\)/g, ")[$1]!()")
    .replace(
      /attachComponent\((root\.(?:value|current)), definition, \{\s*props(?:: (componentProps))?,\s*controller,\s*\}\)/g,
      (_match, root, explicitProps) => `attachLoomaComponent(${root}, definition, "${component.tag}", ${explicitProps ?? "props"})`,
    );
}

function rewriteNestedComponents(source, component, components, framework) {
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
  const propertyNames = [...definitionSource.matchAll(/\s\.([\w-]+)=/g)].map((match) => match[1]);
  for (const propertyName of new Set(propertyNames)) {
    source = source.replace(new RegExp(`\\s${propertyName}=\\{prop\\d+(?: \\?\\? undefined)?\\}`, "gi"), "");
  }
  return source
    .replace(/\breadonly=/g, "readOnly=")
    .replace(/(^|\s)autocomplete=/gm, "$1autoComplete=");
}

async function materializeRegistry(group, components, output) {
  const imports = [];
  const records = [];
  for (const [index, component] of components.entries()) {
    let controller = "undefined";
    if (component.controller) {
      const name = `controller${index}`;
      imports.push(`import * as ${name} from "../../${group}/components/controllers/${component.tag}.js";`);
      controller = name;
    }
    const definition = (await readFile(join(HERE, "generated", group, "components", `${component.tag}.html`), "utf8"))
      .replace(/^<link\s+rel="component"[^>]*>\s*$/gm, "");
    records.push(`  { tag: ${JSON.stringify(component.tag)}, source: ${JSON.stringify(definition)}, controller: ${controller} },`);
  }
  // Core definitions carry their component styles inline, so the runtime installs
  // them while registering the declarative graph. Layout and editor styles are
  // package-level resources and remain explicit adoption assets.
  const styles = group === "core"
    ? ""
    : await readFile(join(HERE, "generated", group, "styles.css"), "utf8");
  const source = `${imports.join("\n")}\n\nexport const records = [\n${records.join("\n")}\n];\nexport const styles = ${JSON.stringify(styles)};\n`;
  await writeFile(join(output, group, "registry.js"), source);
  await writeFile(join(output, group, "registry.d.ts"), [
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
    const definitionSource = await readFile(join(HERE, "generated", groups.core.includes(component) ? "core" : groups.layout.includes(component) ? "layout" : "editor", "components", `${component.tag}.html`), "utf8");
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
    const definitionSource = await readFile(join(HERE, "generated", groups.core.includes(component) ? "core" : groups.layout.includes(component) ? "layout" : "editor", "components", `${component.tag}.html`), "utf8");
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
      .replace(new RegExp(`import \\* as controller from "\\.\\.\/controllers\/${component.tag}\/controllers\/${component.tag}\\.js";\\n`), "")
      .replace(new RegExp(`import "\\.\\.\/styles\/${component.tag}\\.css";\\n`), "")
      .replace(
        `element.setAttribute("data-component-root", "${component.tag}");`,
        `element.setAttribute("data-component-root", "${component.tag}");\n  element.setAttribute("data-looma-managed", "framework");`,
      )
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
  const output = outputArgument ? join(process.cwd(), outputArgument.slice("--output=".length)) : DEFAULT_OUTPUT;
  await rm(output, { recursive: true, force: true });
  for (const group of Object.keys(groups)) await mkdir(join(output, group), { recursive: true });
  for (const [group, components] of Object.entries(groups)) await materializeRegistry(group, components, output);

  const runtimeSource = await readFile(join(HERE, "vendor", "html-next-runtime.iife.js"), "utf8");
  const hydrationLoop = "if(d){for(let p=0;p<m.length;p+=1)";
  const fragmentAwareHydrationLoop = "if(d){m=m.flatMap(p=>p.nodeType===11?Array.from(p.childNodes):[p]);for(let p=0;p<m.length;p+=1)";
  const slotNameReader = 'function Ei(e){return e instanceof Element?e.getAttribute("slot")??"":""}';
  const frameworkSlotNameReader = 'function Ei(e){return e.__loomaFrameworkSlot??(e instanceof Element?e.getAttribute("slot")??"":"")}';
  const hydrationScanner = 'let c=[],l=(m,f)=>{let p=f.children.filter(w=>w.kind==="text").map(w=>w.value),h=0,v=f.children.filter(w=>w.kind==="element"),S=0;for(let w of Array.from(m.childNodes)){if(w instanceof Element){if(!(w.getAttribute("data-component")?.split(/\\s+/)??[]).includes(t.contract.tag))Ve(w),c.push(w);else{';
  const frameworkAwareHydrationScanner = 'let c=Array.from(e.querySelectorAll("[data-looma-framework-slot]")).filter(w=>w.closest("[data-component-root]")===e);for(let w of c)w.__loomaFrameworkSlot=w.getAttribute("data-looma-framework-slot")??"",Ve(w);let C=new Set(c),l=(m,f)=>{let q=f.children.find(w=>w.kind==="slot"),k=q?.name??"",p=f.children.filter(w=>w.kind==="text").map(w=>w.value),h=0,v=f.children.filter(w=>w.kind==="element"),S=0;for(let w of Array.from(m.childNodes)){if(w instanceof Element){if(!(w.getAttribute("data-component")?.split(/\\s+/)??[]).includes(t.contract.tag)){if(!C.has(w))w.__loomaFrameworkSlot=w.getAttribute("data-looma-framework-slot")??k,Ve(w),c.push(w)}else{';
  const hydrationTextScanner = 'b!==void 0&&l(w,b)}continue}if(w instanceof Text&&w.data.trim()!==""){';
  const frameworkAwareHydrationTextScanner = 'b!==void 0&&l(w,b)}continue}if(w instanceof Comment&&q!==void 0){w.__loomaFrameworkSlot=k,c.push(w);continue}if(w instanceof Text&&w.data.trim()!==""){';
  const flowRenderer = 'function Rn(e,t,n,r,i,o){if(e.flow?.kind==="if"||e.flow?.kind==="each"||e.flow?.kind==="with"||e.flow?.kind==="match")return hi(e,t,n,r,i);let a=[];for(let s of mi(e.flow,t))a.push(...ve(e,s,n,r,i,o));return a}';
  const frameworkAwareFlowRenderer = 'function Rn(e,t,n,r,i,o){if(e.flow?.kind==="if"||e.flow?.kind==="each"||e.flow?.kind==="with"||e.flow?.kind==="match"){if(i.committed&&i.root?.getAttribute("data-looma-managed")==="framework"&&o!==void 0)return[o];return hi(e,t,n,r,i)}let a=[];for(let s of mi(e.flow,t))a.push(...ve(e,s,n,r,i,o));return a}';
  if (!runtimeSource.includes(hydrationLoop)) {
    throw new Error("The vendored runtime hydration loop changed; review the framework fragment compatibility patch.");
  }
  if (!runtimeSource.includes(slotNameReader) || !runtimeSource.includes(hydrationScanner) || !runtimeSource.includes(hydrationTextScanner)) {
    throw new Error("The vendored runtime hydration scanner changed; review the framework slot compatibility patch.");
  }
  if (!runtimeSource.includes(flowRenderer)) {
    throw new Error("The vendored runtime flow renderer changed; review the framework ownership compatibility patch.");
  }
  const runtime = runtimeSource
    // Flow nodes render through DocumentFragments. Flatten those fragments before
    // reconciling a framework-owned native root so the runtime counts the real
    // inserted nodes instead of deleting the flow region and following siblings.
    .replace(hydrationLoop, fragmentAwareHydrationLoop)
    // Framework renderers use comment anchors for conditional slot regions and
    // render slots directly into the generated native tree. Retain those anchors
    // and their region identity while the declarative runtime adopts the
    // already-rendered root, so later reactive inserts stay under framework control.
    // Discover explicit framework slot wrappers before structurally walking the
    // template. A flow container can render a sibling whose native tag does not
    // appear directly in the AST, and the walk must not skip every later slot
    // region while searching past that sibling.
    .replace(slotNameReader, frameworkSlotNameReader)
    .replace(hydrationScanner, frameworkAwareHydrationScanner)
    .replace(hydrationTextScanner, frameworkAwareHydrationTextScanner)
    // Vue owns the conditional node already present in a framework-managed root.
    // Keep that node and its framework anchor intact instead of installing a
    // second declarative flow that would invalidate Vue's later patch target.
    .replace(flowRenderer, frameworkAwareFlowRenderer)
    .replace('"use strict";var HtmlRuntime=', "const HtmlRuntime=")
    .concat("\nexport const { attachComponent, attachRegisteredComponent, getComponentHost, installComponentGraph, lowerDocument, manageComponentLifecycle, observeDocument, registerComponentDefinitions, setControllerModule } = HtmlRuntime;\n");
  await writeFile(join(output, "runtime.js"), runtime);
  await writeFile(join(output, "runtime.d.ts"), [
    "export declare function attachComponent(element: Element, definition: unknown, options?: { props?: Record<string, unknown>; controller?: unknown }): () => void;",
    "export declare function attachRegisteredComponent(element: Element, tag: string, options?: { props?: Record<string, unknown>; controller?: unknown }): () => void;",
    "export declare function getComponentHost(element: Element): unknown;",
    "export declare function installComponentGraph(...args: unknown[]): unknown;",
    "export declare function lowerDocument(root?: Document): unknown;",
    "export declare function manageComponentLifecycle(element: Element, definition: unknown, options?: { props?: Record<string, unknown>; controller?: unknown }): () => void;",
    "export declare function observeDocument(root?: Document, options?: { shouldLower?: (element: Element, definition: { contract: { tag: string } }, hydration: boolean) => boolean; onConnect?: (element: Element, definition: { contract: { tag: string } }) => void | (() => void); onError?: (error: unknown) => void }): () => void;",
    "export declare function registerComponentDefinitions(definitions: readonly unknown[], root?: Document): void;",
    "export declare function setControllerModule(element: Element, module: Promise<unknown>): void;",
    "",
  ].join("\n"));
  await cp(join(HERE, "vendor", "html-next-generated-runtime.js"), join(output, "generated-runtime.js"));
  await writeFile(join(output, "generated-runtime.d.ts"), [
    "export interface GeneratedProp {",
    "  readonly name: string;",
    "  readonly attribute: string;",
    "  readonly value: unknown;",
    "  readonly type: string | readonly unknown[];",
    "  readonly required: boolean;",
    "}",
    "export declare function manageGeneratedProps(element: Element, props: readonly GeneratedProp[], apply?: (name: string, value: unknown) => void): () => void;",
    "",
  ].join("\n"));

  const allComponents = Object.values(groups).flat();
  await materializeReact(allComponents);
  await materializeVue(allComponents);
  await materializeVanilla(allComponents);
  console.log(`Materialized ${allComponents.length} shipping components in ${relative(REPOSITORY, output)} plus React/Vue/Vanilla adapters.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
