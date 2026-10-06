import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { formatType, parseComponentResource, typeScriptType } from "../../packages/looma/node_modules/@nextwebwg/html-next/dist/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

export const DECLARATIVE_GROUPS = Object.freeze([
  {
    name: "components",
    packageName: "@threadlabs/looma",
    directory: "packages/looma/src/components",
  },
]);

function parseAttributes(source) {
  const attributes = {};
  const pattern = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  for (const match of source.matchAll(pattern)) attributes[match[1]] = match[2] ?? match[3] ?? "";
  return attributes;
}

function parseDefault(value, type) {
  if (value === undefined) return undefined;
  if (type === "boolean") return value === "true";
  if (type === "number" || type === "integer") return Number(value);
  if (value === "null") return null;
  return value;
}

function camelToKebab(value) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function stripDefinitionPreamble(source) {
  return source
    .replace(/^\s*<link\s+rel="component"[^>]*>\s*$/gm, "")
    .replace(/<defs>[\s\S]*?<\/defs>/, "")
    .replace(/<style>[\s\S]*?<\/style>/, "");
}

function inferRoot(source, tag) {
  const template = stripDefinitionPreamble(source);
  const body = template
    .replace(/^\s*<template\b[^>]*>/, "")
    .replace(/<\/template>\s*$/, "")
    .trim();
  // A polymorphic root (`<template $match>`) renders its `$else` arm by default, as HTML Next records it.
  const match = /^<template\s+\$match\b/.test(body)
    ? /<([a-z][a-z0-9-]*)\b[^>]*\s\$else\b/i.exec(body)
    : /^<([a-z][a-z0-9-]*)\b/i.exec(body);
  if (!match) throw new SyntaxError(`${tag}: declarative definition has no native root`);
  return match[1];
}

/** Direct <defs> props only; nested object fields belong to their owning declaration. */
function directProps(defs) {
  const props = [];
  const stack = [];
  const tags = /<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi;
  let current;
  for (const match of defs.matchAll(tags)) {
    const closing = match[0].startsWith("</");
    const tag = match[1].toLowerCase();
    if (!closing) {
      if (tag === "prop" && stack.length === 0) {
        current = { attributes: parseAttributes(match[0]), start: match.index + match[0].length };
      }
      stack.push(tag);
    } else {
      if (stack.pop() !== tag) throw new SyntaxError(`Mismatched </${tag}> in <defs>`);
      if (tag === "prop" && stack.length === 0 && current) {
        const body = defs.slice(current.start, match.index);
        props.push({ attributes: current.attributes, description: body.replace(/<prop\b[^>]*>[\s\S]*?<\/prop>/g, "").replace(/\s+/g, " ").trim() });
        current = undefined;
      }
    }
  }
  return props;
}

/** Each prop's authored description: the prose inside its direct `<prop>` element. */
function parsePropDescriptions(defs) {
  return Object.freeze(Object.fromEntries(directProps(defs)
    .filter(({ attributes }) => attributes.name)
    .map(({ attributes, description }) => [attributes.name, description])));
}

function parseProps(defs) {
  const props = {};
  for (const { attributes } of directProps(defs)) {
    if (!attributes.name || !attributes.type) throw new SyntaxError("Every declarative prop needs name and type");
    const declaration = {
      type: attributes.type,
      ...(attributes.attribute ? { attribute: attributes.attribute } : {}),
      ...(attributes["default-true-reason"] ? { defaultTrueReason: attributes["default-true-reason"] } : {}),
    };
    if (Object.hasOwn(attributes, "default")) {
      declaration.default = parseDefault(attributes.default, attributes.type);
    }
    props[attributes.name] = Object.freeze(declaration);
  }
  return Object.freeze(props);
}

function parseNamedDefinitions(defs, element, map) {
  const values = [];
  const pattern = new RegExp(`<${element}\\b([^>]*)>(?:[\\s\\S]*?)<\\/${element}>`, "g");
  for (const match of defs.matchAll(pattern)) {
    const attributes = parseAttributes(match[1]);
    if (!attributes.name) throw new SyntaxError(`Every declarative ${element} needs a name`);
    values.push(Object.freeze(map(attributes)));
  }
  return Object.freeze(values);
}

function parseSlots(source) {
  const slots = [];
  for (const match of source.matchAll(/<slot\b([^>]*)>/g)) {
    const name = parseAttributes(match[1]).name ?? "default";
    if (!slots.includes(name)) slots.push(name);
  }
  return Object.freeze(slots);
}

function parseDependencies(source) {
  return Object.freeze([...source.matchAll(/<link\s+rel="component"\s+href="\.\.\/(ui-[a-z0-9-]+)\/\1\.html"\s*>/g)]
    .map((match) => match[1]));
}

function selectedTypeDescription(select) {
  const groups = new Map();
  for (const option of select.options) {
    const type = formatType(option.type);
    groups.set(type, [...(groups.get(type) ?? []), String(option.value)]);
  }
  const entries = [...groups.entries()];
  const special = entries.length === 2 && entries[0][1].length !== entries[1][1].length
    ? entries.find(([, values]) => values.length === Math.min(...entries.map(([, choices]) => choices.length)))
    : undefined;
  if (special) {
    const other = entries.find((entry) => entry !== special);
    return `${select.from}=${special[1].join(", ")} → ${special[0]}; otherwise → ${other[0]}`;
  }
  return entries.map(([type, values]) => `${select.from}=${values.join(", ")} → ${type}`).join("; ");
}

function fieldType(node) {
  if (node.kind === "constrained") return fieldType(node.base);
  if (node.kind === "object") return "object";
  if (node.kind === "list") return `list(${fieldType(node.item)})`;
  if (node.kind === "union" && node.members.length === 2) {
    const base = node.members.find((member) => !(member.kind === "terminal" && member.name === "null"));
    const nullable = node.members.some((member) => member.kind === "terminal" && member.name === "null");
    if (nullable && base) return `${fieldType(base)} | null`;
  }
  return formatType(node);
}

function shapeFields(node, prefix = "") {
  if (node.kind === "list") return shapeFields(node.item, `${prefix}[]`);
  if (node.kind !== "object") return [];
  return node.fields.flatMap((field) => {
    const path = prefix ? `${prefix}.${field.name}` : field.name;
    const base = field.type.kind === "union"
      ? field.type.members.find((member) => !(member.kind === "terminal" && member.name === "null")) ?? field.type
      : field.type;
    return [{
      path,
      type: fieldType(field.type),
      required: !field.optional,
      ...(base.kind === "constrained" ? { values: base.values.map(String) } : {}),
    }, ...shapeFields(base, path)];
  });
}

export function parseDeclarativeContract(source, expectedTag) {
  const template = /<template\b([^>]*)>/.exec(source);
  if (!template) throw new SyntaxError(`${expectedTag}: missing component template`);
  const templateAttributes = parseAttributes(template[1]);
  const tag = templateAttributes.component;
  if (tag !== expectedTag) throw new SyntaxError(`${expectedTag}: definition declares ${tag || "no component"}`);
  const defs = /<defs>([\s\S]*?)<\/defs>/.exec(source)?.[1] ?? "";
  const style = /<style>([\s\S]*?)<\/style>/.exec(source)?.[1] ?? "";

  return Object.freeze({
    root: inferRoot(source, tag),
    props: parseProps(defs),
    propDescriptions: parsePropDescriptions(defs),
    slots: parseSlots(source),
    events: parseNamedDefinitions(defs, "event", (attributes) => ({
      name: attributes.name,
      type: attributes.type ?? "unknown",
    })),
    dependencies: parseDependencies(source),
    summary: templateAttributes.summary ?? "",
    style,
  });
}

export async function readDeclarativeContractGroups() {
  return Promise.all(DECLARATIVE_GROUPS.map(async (group) => {
    // Each component is a folder: src/components/<tag>/<tag>.html.
    const componentDirectory = group.directory;
    const tags = (await readdir(path.join(repoRoot, componentDirectory)))
      .filter((name) => name.startsWith("ui-"))
      .sort();
    const entries = await Promise.all(tags.map(async (tag) => {
      const sourcePath = path.posix.join(componentDirectory, tag, `${tag}.html`);
      const source = await readFile(path.join(repoRoot, sourcePath), "utf8");
      const contract = parseDeclarativeContract(source, tag);
      const definition = parseComponentResource(source, sourcePath).definition;
      const propTypes = Object.fromEntries(Object.entries(definition.contract.props).map(([name, parsed]) => [
        name, parsed.values ? parsed.values.map((value) => JSON.stringify(value)).join(" | ") : typeScriptType(parsed.type),
      ]));
      const propOptions = Object.fromEntries(Object.entries(definition.contract.props)
        .filter(([, parsed]) => parsed.values)
        .map(([name, parsed]) => [name, parsed.values]));
      const propValueTypes = Object.fromEntries(Object.entries(definition.contract.props).map(([name, parsed]) => [
        name, parsed.select
          ? selectedTypeDescription(parsed.select)
          : parsed.type.kind === "object" || parsed.type.kind === "list" ? fieldType(parsed.type) : contract.props[name]?.type ?? formatType(parsed.type),
      ]));
      const propFields = Object.fromEntries(Object.entries(definition.contract.props)
        .filter(([, parsed]) => shapeFields(parsed.type).length > 0)
        .map(([name, parsed]) => [name, shapeFields(parsed.type)]));
      const events = definition.declarations.filter((item) => item.kind === "event")
        .map((item) => ({ name: item.name, type: item.type, detailType: typeScriptType(item.shape ?? item.type), detailShape: fieldType(item.shape ?? item.type), fields: shapeFields(item.shape ?? item.type) }));
      return [tag, Object.freeze({
        ...contract,
        propTypes: Object.freeze(propTypes),
        propOptions: Object.freeze(propOptions),
        propFields: Object.freeze(propFields),
        propValueTypes: Object.freeze(propValueTypes),
        propDescriptions: Object.freeze(Object.fromEntries(Object.entries(definition.contract.props)
          .map(([name, prop]) => [name, prop.description.replace(/\s+/g, " ").trim()]))),
        events: Object.freeze(events),
        source,
        sourcePath,
      })];
    }));
    return Object.freeze({
      ...group,
      contracts: Object.freeze(Object.fromEntries(entries)),
    });
  }));
}

export function publicAttributeName(name, declaration) {
  return declaration.attribute ?? camelToKebab(name);
}
