import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { coreContracts } from "../migrate-html-next/core-contracts.mjs";
import { editorContracts } from "../migrate-html-next/editor-contracts.mjs";
import { layoutContracts } from "../migrate-html-next/layout-contracts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const CONTRACT_GROUPS = [
  { packageName: "@threadlabs/looma", contracts: coreContracts },
  { packageName: "@threadlabs/looma/layout", contracts: layoutContracts },
  { packageName: "@threadlabs/looma/editor", contracts: editorContracts },
];

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
  requiredContractReadmeTags = [],
  contractReadmeTags = [],
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

  pushSetDifference(errors, "metadata", publishedTags, metadataTags);
  pushSetDifference(errors, "documentation", publishedTags, documentationTags);
  pushSetDifference(errors, "navigation", publishedTags, navigationTags);
  pushSetDifference(errors, "adapter map", publishedTags, adapterMapTags);
  pushSetDifference(errors, "adapter", publishedTags, adapterTags);

  const readmeSet = new Set(contractReadmeTags);
  const missingReadmes = requiredContractReadmeTags.filter((tag) => !readmeSet.has(tag)).sort();
  if (missingReadmes.length > 0) {
    errors.push(`contract README missing required tags: ${missingReadmes.join(", ")}`);
  }

  if (errors.length > 0) {
    throw new Error(`Component release projections are incomplete:\n- ${errors.join("\n- ")}`);
  }
}

export async function readRepositoryProjectionTags() {
  const docsDirectory = path.join(repoRoot, "apps/docs/docs/components");
  const docEntries = await readdir(docsDirectory, { withFileTypes: true });
  const documentationTags = docEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
    .map((entry) => entry.name.replace(/\.mdx$/, ""));

  const navigationSource = await readFile(
    path.join(repoRoot, "apps/docs/src/componentNavigation.ts"),
    "utf8",
  );
  const navigationTags = [...navigationSource.matchAll(/tag:\s*"(ui-[a-z0-9-]+)"/g)]
    .map((match) => match[1]);

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

  const coreContractDirectory = path.join(repoRoot, "packages/core/src");
  const coreContractEntries = await readdir(coreContractDirectory, { withFileTypes: true });
  const contractReadmeTags = [];
  for (const entry of coreContractEntries) {
    if (!entry.isDirectory() || !entry.name.startsWith("ui-")) continue;
    try {
      await readFile(path.join(coreContractDirectory, entry.name, "README.md"), "utf8");
      contractReadmeTags.push(entry.name);
    } catch {
      // The completeness error below reports required missing contracts by tag.
    }
  }

  return {
    documentationTags,
    navigationTags,
    adapterMapTags: adapterEntries.map((entry) => entry.tag),
    adapterTags: adapterEntries
      .filter((entry) => exportedNames.has(entry.name))
      .map((entry) => entry.tag),
    contractReadmeTags,
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

function camelToKebab(value) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

async function readComponentDocDescriptions() {
  const componentDocsDirectory = path.join(repoRoot, "apps/docs/docs/components");
  const entries = await readdir(componentDocsDirectory, { withFileTypes: true });
  const descriptions = new Map();

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".mdx")) continue;
    const content = await readFile(path.join(componentDocsDirectory, entry.name), "utf8");
    const lines = content.split("\n");
    const titleIndex = lines.findIndex((line) => line.startsWith("# "));
    if (titleIndex < 0) continue;
    const tag = entry.name.replace(/\.mdx$/, "");
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

function contractMetadata(tag, packageName, contract, description) {
  const properties = Object.entries(contract.props ?? {}).map(([name, declaration]) => ({
    name,
    type: declarativeTypeToTypeScript(declaration.type),
    ...(Object.hasOwn(declaration, "default") ? { default: declaration.default } : {}),
    ...(literalOptions(declaration.type) ? { options: literalOptions(declaration.type) } : {}),
    channel: declaration.channel === "property" ? "property" : "attribute | property",
  }));
  const attributes = Object.entries(contract.props ?? {})
    .filter(([, declaration]) => declaration.channel !== "property")
    .map(([name, declaration]) => ({
      name: declaration.attribute ?? camelToKebab(name),
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
  const descriptions = await readComponentDocDescriptions();
  const components = CONTRACT_GROUPS.flatMap(({ packageName, contracts }) =>
    Object.entries(contracts).map(([tag, contract]) =>
      contractMetadata(tag, packageName, contract, descriptions.get(tag) ?? "")))
    .sort((left, right) => left.tag.localeCompare(right.tag));

  const sourceComponents = CONTRACT_GROUPS.flatMap(({ packageName, contracts }) =>
    Object.keys(contracts).map((tag) => ({ tag, package: packageName })));
  const classificationsDocument = JSON.parse(
    await readFile(path.join(repoRoot, RELEASE_CLASSIFICATION_PATH), "utf8"),
  );
  const classifications = classificationsDocument.tags ?? {};
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
  const requiredContractReadmeTags = Object.entries(classifications)
    .filter(([, value]) => classificationStatus(value) === "published")
    .filter(([, value]) => typeof value === "object" && value?.package === "@threadlabs/looma")
    .map(([tag]) => tag);

  validateComponentProjections({
    sourceTags: sourceComponents.map((component) => component.tag),
    classifications,
    metadataTags: components.map((component) => component.tag),
    documentationTags: repositoryProjections.documentationTags,
    navigationTags: repositoryProjections.navigationTags,
    adapterMapTags: repositoryProjections.adapterMapTags,
    adapterTags: repositoryProjections.adapterTags,
    requiredContractReadmeTags,
    contractReadmeTags: repositoryProjections.contractReadmeTags,
  });

  return { schemaVersion: 2, components };
}
