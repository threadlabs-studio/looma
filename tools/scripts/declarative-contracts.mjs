import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

export const DECLARATIVE_GROUPS = Object.freeze([
  {
    name: "core",
    packageName: "@threadlabs/looma",
    directory: "packages/core/src/declarative",
  },
  {
    name: "layout",
    packageName: "@threadlabs/looma/layout",
    directory: "packages/layout/src/declarative",
  },
  {
    name: "editor",
    packageName: "@threadlabs/looma/editor",
    directory: "packages/editor/src/declarative",
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
  const match = /^<([a-z][a-z0-9-]*)\b/i.exec(body);
  if (!match) throw new SyntaxError(`${tag}: declarative definition has no native root`);
  return match[1];
}

function parseProps(defs) {
  const props = {};
  for (const match of defs.matchAll(/<prop\b([^>]*)>([\s\S]*?)<\/prop>/g)) {
    const attributes = parseAttributes(match[1]);
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
  return Object.freeze([...source.matchAll(/<link\s+rel="component"\s+href="\.\/(ui-[a-z0-9-]+)\.html"\s*>/g)]
    .map((match) => match[1]));
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
    slots: parseSlots(source),
    methods: parseNamedDefinitions(defs, "method", (attributes) => ({
      name: attributes.name,
      returns: attributes.returns ?? "promise(undefined)",
    })),
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
    const componentDirectory = path.join(repoRoot, group.directory, "components");
    const names = (await readdir(componentDirectory))
      .filter((name) => name.endsWith(".html"))
      .sort();
    const entries = await Promise.all(names.map(async (name) => {
      const tag = name.slice(0, -".html".length);
      const sourcePath = path.posix.join(group.directory, "components", name);
      const source = await readFile(path.join(repoRoot, sourcePath), "utf8");
      return [tag, Object.freeze({
        ...parseDeclarativeContract(source, tag),
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
