import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  publicAttributeName,
  readDeclarativeContractGroups,
} from "./declarative-contracts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const CONTRACT_GROUPS = await readDeclarativeContractGroups();

const RELEASE_CLASSIFICATION_PATH = "tools/data/component-release-classification.json";

const EVENT_DETAIL_DOCS = {
  open: "Emitted when the component transitions to an open state.",
  close: "Emitted when the component transitions to a closed state.",
  select: "Emitted when a selectable option becomes active.",
  change: "Emitted when a toggleable control changes checked state.",
  dismiss: "Emitted when a toast item is dismissed from its region.",
};

/**
 * Keeps HTML boolean attributes opt-in. A default-true exception is possible,
 * but it must carry a concrete UX justification in the framework-neutral
 * contract so reviewers and every generated target see the same decision.
 */
export function validateBooleanDefaultPolicy(groups = CONTRACT_GROUPS) {
  const violations = [];
  for (const { contracts } of groups) {
    for (const [tag, contract] of Object.entries(contracts)) {
      for (const [name, declaration] of Object.entries(contract.props ?? {})) {
        if (declaration.type !== "boolean" || declaration.default !== true) continue;
        if (typeof declaration.defaultTrueReason !== "string" || declaration.defaultTrueReason.trim() === "") {
          violations.push(`${tag}.${name}`);
        }
      }
    }
  }
  if (violations.length > 0) {
    throw new Error(
      `Boolean props must default to false unless defaultTrueReason documents a strong UX exception: ${violations.join(", ")}`,
    );
  }
}

function duplicates(values) {
  const seen = new Set();
  const duplicateValues = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicateValues.add(value);
    seen.add(value);
  }
  return [...duplicateValues].sort();
}

function classificationStatus(value) {
  return typeof value === "string" ? value : value?.status;
}

function pushSetDifference(errors, label, expected, actual) {
  const actualSet = new Set(actual);
  const missing = expected.filter((tag) => !actualSet.has(tag));
  if (missing.length > 0) errors.push(`${label} missing published tags: ${missing.join(", ")}`);

  const expectedSet = new Set(expected);
  const extra = [...new Set(actual)].filter((tag) => !expectedSet.has(tag)).sort();
  if (extra.length > 0) errors.push(`${label} includes non-published tags: ${extra.join(", ")}`);

  const duplicateTags = duplicates(actual);
  if (duplicateTags.length > 0) errors.push(`${label} duplicate tags: ${duplicateTags.join(", ")}`);
}

export function validateComponentProjections({
  sourceTags,
  classifications,
  metadataTags,
  documentationTags,
  navigationTags,
  adapterTags,
  adapterMapTags = adapterTags,
}) {
  const errors = [];
  const sortedSourceTags = [...sourceTags].sort();
  const sourceSet = new Set(sortedSourceTags);
  const classificationTags = Object.keys(classifications).sort();
  const allowedStatuses = new Set(["published", "internal", "deferred"]);

  const duplicateSourceTags = duplicates(sourceTags);
  if (duplicateSourceTags.length > 0) {
    errors.push(`source duplicate tags: ${duplicateSourceTags.join(", ")}`);
  }

  const unclassified = sortedSourceTags.filter((tag) => !(tag in classifications));
  if (unclassified.length > 0) errors.push(`unclassified source tags: ${unclassified.join(", ")}`);

  const classificationsWithoutSource = classificationTags.filter((tag) => !sourceSet.has(tag));
  if (classificationsWithoutSource.length > 0) {
    errors.push(`classifications without source tags: ${classificationsWithoutSource.join(", ")}`);
  }

  const invalidClassifications = classificationTags.filter(
    (tag) => !allowedStatuses.has(classificationStatus(classifications[tag])),
  );
  if (invalidClassifications.length > 0) {
    errors.push(`invalid tag classifications: ${invalidClassifications.join(", ")}`);
  }

  const publishedTags = classificationTags.filter(
    (tag) => classificationStatus(classifications[tag]) === "published",
  );
  const navigationTagsExpected = publishedTags.filter((tag) => (
    typeof classifications[tag] !== "object" || !classifications[tag]?.navigationParent
  ));
  for (const tag of publishedTags) {
    const parent = typeof classifications[tag] === "object" ? classifications[tag]?.navigationParent : undefined;
    if (!parent) continue;
    if (classificationStatus(classifications[parent]) !== "published") {
      errors.push(`navigation parent for ${tag} is not published: ${parent}`);
    } else if (!navigationTags.includes(parent)) {
      errors.push(`navigation parent for ${tag} is not navigated: ${parent}`);
    }
  }

  pushSetDifference(errors, "metadata", publishedTags, metadataTags);
  pushSetDifference(errors, "documentation", publishedTags, documentationTags);
  pushSetDifference(errors, "navigation", navigationTagsExpected, navigationTags);
  pushSetDifference(errors, "adapter map", publishedTags, adapterMapTags);
  pushSetDifference(errors, "adapter", publishedTags, adapterTags);

  if (errors.length > 0) {
    throw new Error(`Component release projections are incomplete:\n- ${errors.join("\n- ")}`);
  }
}

/**
 * Component pages, by tag. Pages under docs/components/<group>/ and docs/editor/ are the navigation
 * (the sidebars are generated from those folders); part pages under docs/parts/ are not navigated.
 */
async function readComponentPages() {
  const docsRoot = path.join(repoRoot, "apps/docs/docs");
  const entries = await readdir(docsRoot, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /^ui-[a-z0-9-]+\.mdx$/.test(entry.name))
    .map((entry) => {
      const directory = path.relative(docsRoot, entry.parentPath);
      return { tag: entry.name.replace(/\.mdx$/, ""), file: path.join(entry.parentPath, entry.name), navigated: directory !== "parts" };
    });
}

export async function readRepositoryProjectionTags() {
  const pages = await readComponentPages();
  const documentationTags = pages.map(({ tag }) => tag);
  const navigationTags = pages.filter(({ navigated }) => navigated).map(({ tag }) => tag);

  const adapterSources = await Promise.all([
    readFile(path.join(repoRoot, "packages/vue/src/index.ts"), "utf8"),
    readFile(path.join(repoRoot, "packages/vue/src/editor/index.ts"), "utf8"),
    readFile(path.join(repoRoot, "packages/vue/src/editor/primitives.ts"), "utf8"),
  ]);
  const exportedNames = new Set(adapterSources.flatMap((source) =>
    [...source.matchAll(/export const ([A-Za-z0-9_]+)\s*=/g)].map((match) => match[1])));
  const adapterEntries = adapterSources.flatMap((source) =>
    [...source.matchAll(
      /export const (?:ADAPTER_COMPONENT_TAG_MAP|EDITOR_ADAPTER_COMPONENT_TAG_MAP) = \{([\s\S]*?)\} as const;/g,
    )].flatMap((mapMatch) =>
      [...mapMatch[1].matchAll(/([A-Za-z0-9_]+): "(ui-[a-z0-9-]+)"/g)]
        .map((match) => ({ name: match[1], tag: match[2] }))));

  return {
    documentationTags,
    navigationTags,
    adapterMapTags: adapterEntries.map((entry) => entry.tag),
    adapterTags: adapterEntries
      .filter((entry) => exportedNames.has(entry.name))
      .map((entry) => entry.tag),
  };
}

function splitTopLevel(value, separator) {
  const parts = [];
  let start = 0;
  let roundDepth = 0;
  let braceDepth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "(") roundDepth += 1;
    else if (character === ")") roundDepth -= 1;
    else if (character === "{") braceDepth += 1;
    else if (character === "}") braceDepth -= 1;
    else if (character === separator && roundDepth === 0 && braceDepth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}

const TYPE_KEYWORDS = new Set(["boolean", "integer", "never", "null", "number", "string", "undefined", "unknown"]);

export function declarativeTypeToTypeScript(type) {
  const normalized = type.trim();
  const union = splitTopLevel(normalized, "|");
  if (union.length > 1) return union.map(declarativeTypeToTypeScript).join(" | ");
  if (normalized === "integer") return "number";
  if (TYPE_KEYWORDS.has(normalized)) return normalized;
  if (normalized === "function") return "(...args: unknown[]) => unknown";
  if (normalized === "trusted-html" || normalized === "trusted-script") return "string";

  const list = /^list\(([\s\S]*)\)$/.exec(normalized);
  if (list) return `ReadonlyArray<${declarativeTypeToTypeScript(list[1])}>`;

  const promise = /^promise\(([\s\S]*)\)$/.exec(normalized);
  if (promise) return `Promise<${declarativeTypeToTypeScript(promise[1])}>`;

  const object = /^object\(\{([\s\S]*)\}\)$/.exec(normalized);
  if (object) {
    const fields = splitTopLevel(object[1], ",").map((field) => {
      const match = /^([A-Za-z_$][\w$]*)(\?)?\s*:\s*([\s\S]+)$/.exec(field);
      if (!match) throw new TypeError(`Invalid declarative object field: ${field}`);
      return `${match[1]}${match[2] ?? ""}: ${declarativeTypeToTypeScript(match[3])}`;
    });
    return `{ ${fields.join("; ")} }`;
  }

  if (/^[a-z][a-z0-9-]*$/.test(normalized)) return JSON.stringify(normalized);
  return "unknown";
}

function literalOptions(type) {
  const parts = splitTopLevel(type, "|");
  const options = parts.filter((part) => /^[a-z][a-z0-9-]*$/.test(part) && !TYPE_KEYWORDS.has(part));
  return options.length > 0 ? options : undefined;
}

function stripCssComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

function findClosingBrace(source, openIndex) {
  let depth = 1;
  let quote = null;
  for (let index = openIndex + 1; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (quote !== null) {
      if (character === "\\") index += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "/" && next === "*") {
      const commentEnd = source.indexOf("*/", index + 2);
      index = commentEnd < 0 ? source.length : commentEnd + 1;
      continue;
    }
    if (character === "{") depth += 1;
    else if (character === "}" && --depth === 0) return index;
  }
  throw new SyntaxError("Unclosed CSS block while generating component token metadata");
}

function cssBlocks(source) {
  const blocks = [];
  let segmentStart = 0;
  let quote = null;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (quote !== null) {
      if (character === "\\") index += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "/" && next === "*") {
      const commentEnd = source.indexOf("*/", index + 2);
      index = commentEnd < 0 ? source.length : commentEnd + 1;
      continue;
    }
    if (character === ";") {
      segmentStart = index + 1;
      continue;
    }
    if (character !== "{") continue;

    const closeIndex = findClosingBrace(source, index);
    blocks.push({
      prelude: source.slice(segmentStart, index).trim(),
      body: source.slice(index + 1, closeIndex),
    });
    index = closeIndex;
    segmentStart = closeIndex + 1;
  }
  return blocks;
}

function selectorIncludesTag(selector, tag) {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^A-Za-z0-9_-])\\.?${escapedTag}(?![A-Za-z0-9-])`).test(selector);
}

function componentCss(source, tag) {
  const declarations = [];
  const visit = (css) => {
    for (const block of cssBlocks(css)) {
      if (block.prelude.startsWith("@")) visit(block.body);
      else if (selectorIncludesTag(block.prelude, tag)) declarations.push(block.body);
    }
  };
  visit(source);
  return declarations.join("\n");
}

function customPropertyDeclarations(source) {
  const declarations = new Map();
  const pattern = /(--[A-Za-z0-9_-]+)\s*:\s*([^;{}]+);/g;
  for (const match of stripCssComments(source).matchAll(pattern)) {
    const values = declarations.get(match[1]) ?? [];
    const value = match[2].trim().replace(/\s+/g, " ");
    if (!values.includes(value)) values.push(value);
    declarations.set(match[1], values);
  }
  return declarations;
}

function splitVarArguments(value) {
  let depth = 0;
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote !== null) {
      if (character === "\\") index += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === "(") depth += 1;
    else if (character === ")") depth -= 1;
    else if (character === "," && depth === 0) {
      return [value.slice(0, index).trim(), value.slice(index + 1).trim()];
    }
  }
  return [value.trim(), undefined];
}

function customPropertyReferences(source) {
  const references = new Map();
  const css = stripCssComments(source);
  for (let start = css.indexOf("var("); start >= 0; start = css.indexOf("var(", start + 4)) {
    let depth = 1;
    let quote = null;
    let end = start + 4;
    for (; end < css.length && depth > 0; end += 1) {
      const character = css[end];
      if (quote !== null) {
        if (character === "\\") end += 1;
        else if (character === quote) quote = null;
        continue;
      }
      if (character === '"' || character === "'") quote = character;
      else if (character === "(") depth += 1;
      else if (character === ")") depth -= 1;
    }
    if (depth !== 0) throw new SyntaxError("Unclosed var() while generating component token metadata");

    const [name, fallback] = splitVarArguments(css.slice(start + 4, end - 1));
    if (!/^--[A-Za-z0-9_-]+$/.test(name)) continue;
    const fallbacks = references.get(name) ?? [];
    if (fallback && !fallbacks.includes(fallback)) fallbacks.push(fallback);
    references.set(name, fallbacks);
  }
  return references;
}

const privateReference = /^var\((--_[A-Za-z0-9_-]+)\)$/;

// Components keep defaults in private `--_*` variables and read public tokens as
// `var(--ui-x, var(--_x))`. Private variables are not API; a public token's default is the value
// its private variable declares.
function tokenRecord(name, declarations, references) {
  const fallbacks = references.get(name) ?? [];
  const privates = fallbacks.map((fallback) => privateReference.exec(fallback)?.[1]).filter(Boolean);
  const declared = [
    ...(declarations.get(name) ?? []),
    ...privates.flatMap((privateName) => declarations.get(privateName) ?? []),
  ];
  const publicFallbacks = fallbacks.filter((fallback) => !privateReference.test(fallback));
  return {
    name,
    ...(declared.length ? { declarations: declared } : {}),
    ...(publicFallbacks.length ? { fallbacks: publicFallbacks } : {}),
  };
}

export function extractDesignTokensFromCss({ tag, source }) {
  const declarations = customPropertyDeclarations(source);
  const references = customPropertyReferences(source);
  const componentPrefix = `--${tag}-`;
  const isPrivate = (name) => name.startsWith("--_");
  const hasPrivateDefault = (name) => (references.get(name) ?? []).some((fallback) => privateReference.test(fallback));
  const componentNames = new Set([
    ...[...declarations.keys()].filter((name) => !isPrivate(name)),
    ...[...references.keys()].filter((name) => name.startsWith(componentPrefix) || hasPrivateDefault(name)),
  ]);
  const sharedNames = [...references.keys()].filter((name) => !componentNames.has(name) && !isPrivate(name));

  return {
    component: [...componentNames].sort().map((name) => tokenRecord(name, declarations, references)),
    shared: sharedNames.sort().map((name) => tokenRecord(name, declarations, references)),
  };
}

async function componentDesignTokens(tag, group, contract) {
  const packageStylePath = `${group.directory}/styles.css`;
  let sourcePath = contract.sourcePath;
  let scopedSource = contract.style;
  if (scopedSource.trim() === "") {
    sourcePath = packageStylePath;
    const source = await readFile(path.join(repoRoot, sourcePath), "utf8");
    scopedSource = componentCss(source, tag);
  }
  return {
    sources: [sourcePath],
    ...extractDesignTokensFromCss({ tag, source: scopedSource }),
  };
}

async function readComponentDocDescriptions() {
  const descriptions = new Map();

  for (const { tag, file } of await readComponentPages()) {
    const content = await readFile(file, "utf8");
    const lines = content.split("\n");
    const titleIndex = lines.findIndex((line) => line.startsWith("# "));
    if (titleIndex < 0) continue;
    const description = lines.slice(titleIndex + 1)
      .map((line) => line.trim())
      .find((line) => line !== "" && !line.startsWith("import ") && !line.startsWith("## "));
    descriptions.set(tag, description ?? "");
  }

  return descriptions;
}

function slotDescription(name) {
  if (name === "default") return "Default child content.";
  if (name.endsWith("-*")) return `Named content matching the ${name} slot pattern.`;
  return `Named content for the ${name} region.`;
}

function contractMetadata(tag, packageName, contract, description, designTokens) {
  const properties = Object.entries(contract.props ?? {}).map(([name, declaration]) => ({
    name,
    type: declarativeTypeToTypeScript(declaration.type),
    ...(Object.hasOwn(declaration, "default") ? { default: declaration.default } : {}),
    ...(literalOptions(declaration.type) ? { options: literalOptions(declaration.type) } : {}),
  }));
  // Every prop is an HTML attribute (structured shapes as JSON text); there is no property-only channel.
  const attributes = Object.entries(contract.props ?? {})
    .map(([name, declaration]) => ({
      name: publicAttributeName(name, declaration),
      property: name,
      type: declarativeTypeToTypeScript(declaration.type),
      ...(Object.hasOwn(declaration, "default") ? { default: declaration.default } : {}),
      ...(literalOptions(declaration.type) ? { options: literalOptions(declaration.type) } : {}),
    }));
  const events = (contract.events ?? []).map((event) => {
    const type = declarativeTypeToTypeScript(event.type ?? "unknown");
    return {
      name: event.name,
      detailType: type,
      detailSchema: type,
      detailDocs: EVENT_DETAIL_DOCS[event.name] ?? "Emitted with the declared detail payload.",
    };
  });

  return {
    tag,
    package: packageName,
    root: contract.root,
    description,
    designTokens,
    attributes: attributes.sort((left, right) => left.name.localeCompare(right.name)),
    properties: properties.sort((left, right) => left.name.localeCompare(right.name)),
    methods: (contract.methods ?? []).map((method) => ({
      name: method.name,
      returns: declarativeTypeToTypeScript(method.returns ?? "promise(undefined)"),
    })),
    events: events.sort((left, right) => left.name.localeCompare(right.name)),
    slots: (contract.slots ?? []).map((name) => ({ name, description: slotDescription(name) })),
  };
}

export async function generateComponentApiMetadata() {
  validateBooleanDefaultPolicy();
  const classificationsDocument = JSON.parse(
    await readFile(path.join(repoRoot, RELEASE_CLASSIFICATION_PATH), "utf8"),
  );
  const classifications = classificationsDocument.tags ?? {};
  const descriptions = await readComponentDocDescriptions();
  const componentEntries = CONTRACT_GROUPS.flatMap((group) =>
    Object.entries(group.contracts)
      .filter(([tag]) => classificationStatus(classifications[tag]) === "published")
      .map(([tag, contract]) => ({ group, packageName: group.packageName, tag, contract })));
  const components = (await Promise.all(componentEntries.map(async ({ group, packageName, tag, contract }) => ({
    ...await contractMetadata(
      tag,
      packageName,
      contract,
      descriptions.get(tag) ?? "",
      await componentDesignTokens(tag, group, contract),
    ),
    ...(typeof classifications[tag] === "object" && classifications[tag]?.navigationParent
      ? { navigationParent: classifications[tag].navigationParent }
      : {}),
  })))).sort((left, right) => left.tag.localeCompare(right.tag));

  const sourceComponents = CONTRACT_GROUPS.flatMap(({ packageName, contracts }) =>
    Object.keys(contracts).map((tag) => ({ tag, package: packageName })));
  const sourcePackageByTag = new Map(sourceComponents.map((component) => [component.tag, component.package]));
  const packageMismatches = Object.entries(classifications)
    .filter(([, value]) => typeof value === "object" && value?.package)
    .filter(([tag, value]) => sourcePackageByTag.get(tag) !== value.package)
    .map(([tag]) => tag)
    .sort();
  if (packageMismatches.length > 0) {
    throw new Error(`Component release classifications have wrong source packages: ${packageMismatches.join(", ")}`);
  }

  const repositoryProjections = await readRepositoryProjectionTags();

  validateComponentProjections({
    sourceTags: sourceComponents.map((component) => component.tag),
    classifications,
    metadataTags: components.map((component) => component.tag),
    documentationTags: repositoryProjections.documentationTags,
    navigationTags: repositoryProjections.navigationTags,
    adapterMapTags: repositoryProjections.adapterMapTags,
    adapterTags: repositoryProjections.adapterTags,
  });

  return { schemaVersion: 3, components };
}
