import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generateComponentApiMetadata } from "../../../tools/scripts/component-api-generator.mjs";

// Writes each documented component's Examples and API as HTML Next components in generated/,
// which its Markdown page links and places in its `::: tabs`. The examples are the component's
// examples/ files; the API is the metadata from tools/scripts/component-api-generator.mjs.
// The derivation of each example's HTML Next and Vue code follows apps/docs/src (examples/index.ts
// and ComponentModeExample.tsx); the parity test compares the two sites' text.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const componentsRoot = path.join(repoRoot, "packages/looma/src/components");

const escapeHtml = (text) => String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
// HTML Next reads `{` in template text as an expression; generated text is literal.
const text = (value) => escapeHtml(value).replaceAll("{", "\\{");
const code = (value) => `<code>${text(value)}</code>`;

// --- Examples (apps/docs/src/examples/index.ts) ---

function metadata(source, file) {
  const match = /^<!--\n([\s\S]*?)\n-->\n/.exec(source);
  if (!match) throw new Error(`${file}: a component example must start with its metadata comment.`);
  const fields = new Map();
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator > 0) fields.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }
  return { fields, markup: source.slice(match[0].length).trim().replace(/>\s+</g, "><") };
}

const decode = (value) => value.replaceAll("&#39;", "'").replaceAll("&quot;", '"').replaceAll("&amp;", "&");
const camel = (name) => name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

function bindings(markup, spec) {
  const assignments = [];
  let frameworkMarkup = markup;
  for (const pair of (spec ?? "").split(/\s+/).filter(Boolean)) {
    const [attribute, variable] = pair.split("=");
    const tag = new RegExp(`<[^>]*\\s${attribute}='([^']*)'[^>]*>`).exec(frameworkMarkup);
    const elementId = tag ? /\sid="([^"]+)"/.exec(tag[0])?.[1] : undefined;
    if (!tag || !elementId || !variable) throw new Error(`bind "${pair}" does not match an element with an id.`);
    assignments.push({ elementId, property: camel(attribute), variable, value: JSON.parse(decode(tag[1])) });
    frameworkMarkup = frameworkMarkup.replace(tag[0], tag[0].replace(` ${attribute}='${tag[1]}'`, ""));
  }
  return { frameworkMarkup, assignments };
}

async function examplesFor(tag) {
  const directory = path.join(componentsRoot, tag, "examples");
  const files = (await readdir(directory)).sort();
  const examples = [];
  for (const file of files) {
    const name = /^([^.]+)\.html$/.exec(file)?.[1];
    if (!name) continue;
    const source = path.join(directory, file);
    const { fields, markup } = metadata(await readFile(source, "utf8"), source);
    // ponytail: stage 1 needs none of these; stage 2 adds them with the examples that use them.
    if (files.includes(`${name}.behavior.ts`) || fields.get("preview") === "resizable") {
      throw new Error(`${source}: demo behaviour and resizable previews are not generated yet.`);
    }
    const { frameworkMarkup, assignments } = bindings(markup, fields.get("bind"));
    const frameworks = {};
    for (const [mode, extension, language] of [["html-next", ".snippet.html", "html"], ["vue", ".vue", "vue"]]) {
      if (files.includes(name + extension)) {
        frameworks[mode] = { language, code: (await readFile(path.join(directory, name + extension), "utf8")).trimEnd() };
      }
    }
    examples.push({ name, title: fields.get("title") ?? name, description: fields.get("description") ?? "", markup, frameworkMarkup, assignments, frameworks });
  }
  return examples;
}

// --- Code for each mode (apps/docs/src/components/ComponentModeExample.tsx) ---

const voidElements = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const publicName = (tag) => tag.replace(/^ui-/, "").split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
const tagsIn = (markup) => Array.from(new Set(Array.from(markup.matchAll(/<(ui-[a-z0-9-]+)/g), (match) => match[1])));

function withPropertyAttributes(markup, assignments) {
  const escape = (value) => value.replaceAll("&", "&amp;").replaceAll("'", "&#39;");
  return assignments.reduce((source, assignment) => {
    const name = assignment.property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    const value = typeof assignment.value === "string" ? assignment.value : JSON.stringify(assignment.value);
    return source.replace(`id="${assignment.elementId}"`, `id="${assignment.elementId}" ${name}='${escape(value)}'`);
  }, markup);
}

function formatMarkup(markup) {
  const tokens = markup.replace(/>\s*</g, "><").split(/(?=<)|(?<=>)/).map((token) => token.trim()).filter(Boolean);
  const lines = [];
  let depth = 0;
  for (const token of tokens) {
    if (token.startsWith("</")) depth = Math.max(0, depth - 1);
    lines.push(`${"  ".repeat(depth)}${token}`);
    const openingTag = token.match(/^<([a-z][\w-]*)\b/i)?.[1]?.toLowerCase();
    if (openingTag && !token.startsWith("</") && !token.endsWith("/>") && !voidElements.has(openingTag)) depth += 1;
  }
  return lines.join("\n");
}

const renameComponents = (markup) => tagsIn(markup).reduce((source, tag) => {
  const name = publicName(tag);
  return source.replaceAll(`<${tag}`, `<${name}`).replaceAll(`</${tag}>`, `</${name}>`);
}, markup);

const valueCode = (value, indent = "") =>
  JSON.stringify(value, null, 2).split("\n").map((line, index) => (index === 0 ? line : `${indent}${line}`)).join("\n");

const bindProperties = (markup, assignments) => assignments.reduce(
  (source, assignment) => source.replace(`id="${assignment.elementId}"`, `id="${assignment.elementId}" :${assignment.property}="${assignment.variable}"`),
  markup,
);

function modeCode(markup, assignments, packageOf) {
  const tags = tagsIn(markup);
  const packages = Array.from(new Set(tags.map(packageOf).filter(Boolean)));
  const htmlImports = packages.map((name) => `  import ${JSON.stringify(name)};`).join("\n");
  const vueGroups = new Map();
  for (const tag of tags) {
    const name = tag.startsWith("ui-editor-") ? "@threadlabs/looma/vue/editor" : "@threadlabs/looma/vue";
    vueGroups.set(name, [...(vueGroups.get(name) ?? []), publicName(tag)]);
  }
  const vueImports = Array.from(vueGroups, ([name, names]) => `import { ${names.sort().join(", ")} } from ${JSON.stringify(name)};`).join("\n");
  const declarations = assignments.map((assignment) => `const ${assignment.variable} = ${valueCode(assignment.value)};`).join("\n");
  const vue = formatMarkup(bindProperties(renameComponents(markup), assignments));
  const html = formatMarkup(withPropertyAttributes(markup, assignments));
  return {
    "html-next": { language: "html", code: `<script type="module">\n${htmlImports}\n</script>\n\n${html}` },
    vue: {
      language: "vue",
      code: `<script setup lang="ts">\n${vueImports}\n${assignments.length > 0 ? `${declarations}\n` : ""}</script>\n\n<template>\n${vue.split("\n").map((line) => `  ${line}`).join("\n")}\n</template>`,
    },
  };
}

const modes = [["html-next", "HTML Next"], ["vue", "Vue"]];
const componentLinks = (tags) => tags.map((tag) => `<link rel="component" href="@threadlabs/looma/components/${tag}/${tag}.html">`).join("\n");

function examplesComponent(tag, examples, packageOf) {
  const sections = examples.map((example) => {
    const codes = { ...modeCode(example.frameworkMarkup, example.assignments, packageOf), ...example.frameworks };
    const panels = modes.map(([mode, label]) =>
      `<section aria-label="${label}"><pre><code class="language-${codes[mode].language}">${text(codes[mode].code)}</code></pre></section>`).join("");
    return `<section class="example" data-example="${example.name}"><h2>${text(example.title)}</h2><p>${text(example.description)}</p>`
      + `<div class="stage" data-component-preview="${tag}">${example.markup}</div>`
      + `<p><strong>Code</strong></p><ui-tabs label="Example syntax" group="syntax">${panels}</ui-tabs></section>`;
  }).join("\n");
  const tags = Array.from(new Set(["ui-tabs", ...examples.flatMap((example) => tagsIn(example.markup))]));
  return `${componentLinks(tags)}
<template component="looma-examples-${tag}">
<style>
.example + .example { margin-block-start: var(--ui-space-6); }
.stage { padding: var(--ui-space-4); border: 1px solid var(--ui-border-divider); border-radius: var(--ui-radius-m, 8px); }
</style>
<div>
${sections}
</div>
</template>
`;
}

// --- API (apps/docs/src/components/ComponentApi.tsx) ---

const table = (headings, rows) =>
  `<table><thead><tr>${headings.map((heading) => `<th>${text(heading)}</th>`).join("")}</tr></thead><tbody>${rows.map((cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
const shown = (value) => code(value === undefined ? "-" : String(value));
const listed = (values) => code(values?.length ? values.join(", ") : "-");
const tokenValues = (values) => code(values?.length ? values.join(" | ") : "-");

function shapeFields(fields) {
  if (!fields?.length) return "";
  return `<ul>${fields.map((field) => `<li>${code(field.path)}: ${code(field.type)}${field.required ? "" : " (optional)"}${field.values?.length ? ` · allowed values: ${code(field.values.join(", "))}` : ""}</li>`).join("")}</ul>`;
}

function tokenTable(tokens, firstColumn, declarations) {
  return table(
    declarations ? [firstColumn, "Declared values in component CSS", "Fallback when unset"] : [firstColumn, "Fallback in component CSS"],
    tokens.map((token) => [code(token.name), ...(declarations ? [tokenValues(token.declarations)] : []), tokenValues(token.fallbacks)]),
  );
}

function apiBody(api, components, base) {
  const section = (title, items, empty, render) => `<h2>${title}</h2>${items.length === 0 ? `<p>${empty}</p>` : render()}`;
  const parts = components.filter((entry) => entry.navigationParent === api.tag).map((part) =>
    `<section><h2>${text(part.tag.replace(/^ui-/, ""))} API</h2><p>${code(`<${part.tag}>`)} is a compound part of ${code(`<${api.tag}>`)}. Its complete contract follows here so it does not need a misleading standalone page.</p>${apiBody(part, components, base)}</section>`);
  return [
    api.description ? `<p>${text(api.description)}</p>` : "",
    `<p class="meta"><strong>Package:</strong> ${code(api.package)} · <strong>Native root:</strong> ${code(`<${api.root}>`)}</p>`,
    section("Attributes", api.attributes, "No observed attributes.", () => table(
      ["Name", "Description", "Property", "Type", "Default", "Allowed values"],
      api.attributes.map((item) => [code(item.name), text(item.description || "-"), code(item.property), code(item.type) + shapeFields(item.fields), shown(item.default), listed(item.options)]),
    )),
    section("Framework props", api.properties, "No props.", () => "<p>Vue passes the attributes above as these camelCase props.</p>" + table(
      ["Name", "Type", "Default", "Allowed values"],
      api.properties.map((item) => [code(item.name), code(item.type) + shapeFields(item.fields), shown(item.default), listed(item.options)]),
    )),
    section("Events", api.events, "No custom events.", () => table(
      ["Name", "JavaScript detail", "Declared detail", "Notes"],
      api.events.map((event) => [
        code(event.name),
        `<details><summary>${code(event.detailSchema ?? event.detailType)}</summary>${code(event.detailType)}</details>`,
        shapeFields(event.fields) + (event.fields?.length ? "" : code(event.detailSchema ?? "-")),
        text(event.detailDocs ?? "-"),
      ]),
    )),
    section("Slots", api.slots, "No content slots.", () => table(["Name", "Purpose"], api.slots.map((slot) => [code(slot.name), text(slot.description)]))),
    `<h2>Design tokens</h2><p>Extracted from ${code(api.designTokens.sources.join(", "))}. Component tokens are scoped customization points or variables declared by this component. Shared tokens include optional inherited group values and global theme values. The <a href="${base}tokens/">theming guide</a> explains their precedence and where to set them.</p>`,
    `<h3>Component tokens</h3>${api.designTokens.component.length === 0 ? "<p>No component-scoped custom properties.</p>" : tokenTable(api.designTokens.component, "Component token", true)}`,
    `<h3>Inherited group and global tokens consumed</h3>${api.designTokens.shared.length === 0 ? "<p>No shared tokens consumed.</p>" : tokenTable(api.designTokens.shared, "Shared token", false)}`,
    ...parts,
  ].join("\n");
}

const apiComponent = (api, components, base) => `<template component="looma-api-${api.tag}">
<div>
${apiBody(api, components, base)}
</div>
</template>
`;

/** Writes generated/<tag>.examples.html and generated/<tag>.api.html for each tag. */
export async function writeComponentReference({ root, base, tags }) {
  const { components } = await generateComponentApiMetadata();
  const byTag = new Map(components.map((component) => [component.tag, component]));
  const output = path.join(root, "generated");
  await mkdir(output, { recursive: true });
  for (const tag of tags) {
    const api = byTag.get(tag);
    if (!api) throw new Error(`No component API metadata for ${tag}.`);
    const examples = await examplesFor(tag);
    await writeFile(path.join(output, `${tag}.examples.html`), examplesComponent(tag, examples, (name) => byTag.get(name)?.package));
    await writeFile(path.join(output, `${tag}.api.html`), apiComponent(api, components, base));
  }
}
