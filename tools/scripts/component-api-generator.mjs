import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const SOURCE_FILES = [];

// Core/layout API metadata is curated in static JSON until the generator grows
// a reliable parser for the current Stencil/web-component source layout.
const STATIC_COMPONENT_METADATA_FILES = [
  {
    metadataPath: "tools/data/core-component-api.json"
  },
  {
    metadataPath: "tools/data/layout-component-api.json"
  }
];

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function splitList(rawValue) {
  return rawValue
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function kebabToCamel(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function parseDefinitions(sourceText) {
  const definitionMatch = sourceText.match(
    /const definitions[^=]*=\s*(?:\[[\s\S]*?\]|[\s\S]*?\]\s*as const);/
  );
  if (!definitionMatch) {
    return [];
  }

  const tupleRegex = /\[\s*"([^"]+)"\s*,\s*([A-Za-z0-9_]+)\s*\]/g;
  const definitions = [];
  for (const tupleMatch of definitionMatch[0].matchAll(tupleRegex)) {
    definitions.push({
      tag: tupleMatch[1],
      className: tupleMatch[2]
    });
  }
  return definitions;
}

function parseClassExtendsMap(sourceText) {
  const map = new Map();
  const regex = /class\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_]+))?\s*\{/g;
  for (const match of sourceText.matchAll(regex)) {
    const [, className, baseClass] = match;
    map.set(className, baseClass ?? null);
  }
  return map;
}

function parseClassBlock(sourceText, className) {
  const classStart = sourceText.indexOf(`class ${className}`);
  if (classStart < 0) {
    return null;
  }

  const bodyStart = sourceText.indexOf("{", classStart);
  if (bodyStart < 0) {
    return null;
  }

  let depth = 0;
  for (let index = bodyStart; index < sourceText.length; index += 1) {
    const character = sourceText[index];
    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return sourceText.slice(classStart, index + 1);
      }
    }
  }

  return null;
}

function parseStringConstants(sourceText) {
  const constants = new Map();
  const regex = /const\s+([A-Za-z0-9_]+)\s*=\s*"([^"]+)";/g;
  for (const match of sourceText.matchAll(regex)) {
    const [, name, value] = match;
    constants.set(name, value);
  }
  return constants;
}

function normalizeListValue(rawEntry, constants) {
  const entry = rawEntry.trim();
  const stringLiteralMatch = entry.match(/^["'`](.*)["'`]$/);
  if (stringLiteralMatch) {
    return stringLiteralMatch[1];
  }
  return constants.get(entry) ?? entry;
}

function parseObservedAttributes(classBlock, constants) {
  const match = classBlock.match(
    /static\s+get\s+observedAttributes\(\)\s*:\s*[^{}]+\{\s*return\s*\[([\s\S]*?)\];\s*\}/
  );
  if (!match) {
    return [];
  }
  return splitList(match[1]).map((entry) => normalizeListValue(entry, constants));
}

function parseProperties(classBlock) {
  const propertyMap = new Map();
  const getterBodies = parseGetterBodies(classBlock);

  const getterRegex = /get\s+([A-Za-z0-9_]+)\(\)\s*:\s*([^{]+)\{/g;
  for (const match of classBlock.matchAll(getterRegex)) {
    const [, name, type] = match;
    if (name === "observedAttributes") {
      continue;
    }
    const normalizedType = normalizeWhitespace(type);
    propertyMap.set(name, {
      name,
      type: normalizedType,
      default: inferDefaultFromGetterBody(getterBodies.get(name) ?? "", normalizedType),
      options: parseLiteralOptionsFromType(normalizedType),
      source: "getter"
    });
  }

  const setterRegex = /set\s+([A-Za-z0-9_]+)\(\s*[A-Za-z0-9_]+\s*:\s*([^)]+)\)\s*:\s*void\s*\{/g;
  for (const match of classBlock.matchAll(setterRegex)) {
    const [, name, type] = match;
    const existing = propertyMap.get(name);
    const normalizedType = existing?.type ?? normalizeWhitespace(type);
    const options = existing?.options ?? parseLiteralOptionsFromType(normalizedType);
    propertyMap.set(name, {
      name,
      type: normalizedType,
      default: existing?.default,
      options,
      source: existing?.source ?? "setter"
    });
  }

  return Array.from(propertyMap.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function parseEvents(classBlock, interfaceDetailsByName) {
  const eventMap = new Map();
  const eventRegex = /dispatchPrimitiveEvent<([^>]+)>\(this,\s*"([^"]+)"/g;
  for (const match of classBlock.matchAll(eventRegex)) {
    const [, detailType, name] = match;
    if (!eventMap.has(name)) {
      eventMap.set(name, {
        name,
        detailType: normalizeWhitespace(detailType)
      });
    }
  }

  const openCloseRegex =
    /dispatchPrimitiveEvent<([^>]+)>\(this,\s*this\.open\s*\?\s*"open"\s*:\s*"close"/g;
  for (const match of classBlock.matchAll(openCloseRegex)) {
    const [, detailType] = match;
    if (!eventMap.has("open")) {
      eventMap.set("open", {
        name: "open",
        detailType: normalizeWhitespace(detailType)
      });
    }
    if (!eventMap.has("close")) {
      eventMap.set("close", {
        name: "close",
        detailType: normalizeWhitespace(detailType)
      });
    }
  }

  return Array.from(eventMap.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function buildAttributes(observedAttributes, properties) {
  const propertyByName = new Map(properties.map((property) => [property.name, property]));
  const propertyByLowerName = new Map(
    properties.map((property) => [property.name.toLowerCase(), property])
  );

  return observedAttributes.map((attributeName) => {
    const propertyName = kebabToCamel(attributeName);
    const property =
      propertyByName.get(propertyName) ??
      propertyByLowerName.get(propertyName.toLowerCase()) ??
      null;
    const resolvedPropertyName = property?.name ?? propertyName;
    const type = property?.type ?? "string";

    return {
      name: attributeName,
      property: resolvedPropertyName,
      type,
      default: property?.default,
      options: property?.options
    };
  });
}

function parseGetterBodies(classBlock) {
  const bodies = new Map();
  const getterStartRegex = /get\s+([A-Za-z0-9_]+)\(\)\s*:\s*[^{]+\{/g;
  for (const match of classBlock.matchAll(getterStartRegex)) {
    const name = match[1];
    const fullMatch = match[0];
    const braceIndex = match.index + fullMatch.length - 1;
    const body = extractCurlyBlockContent(classBlock, braceIndex);
    if (body) {
      bodies.set(name, body);
    }
  }
  return bodies;
}

function extractCurlyBlockContent(sourceText, braceStartIndex) {
  if (braceStartIndex < 0 || sourceText[braceStartIndex] !== "{") {
    return "";
  }
  let depth = 0;
  for (let index = braceStartIndex; index < sourceText.length; index += 1) {
    const character = sourceText[index];
    if (character === "{") {
      depth += 1;
      continue;
    }
    if (character !== "}") {
      continue;
    }
    depth -= 1;
    if (depth === 0) {
      return sourceText.slice(braceStartIndex + 1, index);
    }
  }
  return "";
}

function parseLiteralOptionsFromType(type) {
  const options = [];
  const quoteRegex = /["']([^"']+)["']/g;
  for (const match of type.matchAll(quoteRegex)) {
    options.push(match[1]);
  }
  return options.length > 0 ? Array.from(new Set(options)).sort() : undefined;
}

function inferDefaultFromGetterBody(getterBody, type) {
  if (!getterBody) {
    return undefined;
  }

  const stringDefaultMatch =
    getterBody.match(/return\s+this\.getAttribute\([^)]*\)\s*\?\?\s*"([^"]*)"/) ??
    getterBody.match(/return\s+this\.getAttribute\([^)]*\)\s*\?\?\s*'([^']*)'/);
  if (stringDefaultMatch) {
    return stringDefaultMatch[1];
  }

  if (getterBody.includes("this.getAttribute(") && getterBody.includes('!== "false"')) {
    return true;
  }

  if (getterBody.includes("normalizeOrientation(")) {
    return "horizontal";
  }

  if (getterBody.includes("this.getBooleanAttribute(")) {
    return false;
  }

  if (getterBody.includes("this.getStringAttribute(")) {
    return "";
  }

  if (type === "boolean") {
    return false;
  }

  return undefined;
}

function parseDetailInterfaces(sourceText) {
  const interfaces = new Map();
  const interfaceRegex = /interface\s+([A-Za-z0-9_]+)\s*\{([\s\S]*?)\n\}/g;
  for (const match of sourceText.matchAll(interfaceRegex)) {
    const [, interfaceName, body] = match;
    const fields = [];
    const fieldRegex = /([A-Za-z0-9_]+)(\?)?:\s*([^;]+);/g;
    for (const fieldMatch of body.matchAll(fieldRegex)) {
      fields.push({
        name: fieldMatch[1],
        optional: fieldMatch[2] === "?",
        type: normalizeWhitespace(fieldMatch[3])
      });
    }
    interfaces.set(interfaceName, fields);
  }
  return interfaces;
}

function formatDetailSchema(detailType, interfaceDetailsByName) {
  const fields = interfaceDetailsByName.get(detailType);
  if (!fields || fields.length === 0) {
    return detailType;
  }
  const formatted = fields.map((field) => `${field.name}${field.optional ? "?" : ""}: ${field.type}`);
  return `{ ${formatted.join("; ")} }`;
}

const EVENT_DETAIL_DOCS = {
  open: "Emitted when the component transitions to an open state.",
  close: "Emitted when the component transitions to a closed state.",
  select: "Emitted when a selectable option becomes active.",
  change: "Emitted when a toggleable control changes checked state.",
  dismiss: "Emitted when a toast item is dismissed from its region."
};

function enrichEventMetadata(events, interfaceDetailsByName) {
  return events.map((event) => ({
    ...event,
    detailSchema: formatDetailSchema(event.detailType, interfaceDetailsByName),
    detailDocs:
      EVENT_DETAIL_DOCS[event.name] ??
      `Emitted with \`${event.detailType}\` detail payload.`
  }));
}

function mergeByName(entries) {
  const map = new Map();
  for (const entry of entries) {
    if (!map.has(entry.name)) {
      map.set(entry.name, entry);
    }
  }
  return Array.from(map.values()).sort(compareByName);
}

async function readComponentDocDescriptions() {
  const componentDocsDirectory = path.join(repoRoot, "apps/docs/docs/components");
  const entries = await readdir(componentDocsDirectory, { withFileTypes: true });
  const descriptions = new Map();

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".mdx")) {
      continue;
    }
    const fullPath = path.join(componentDocsDirectory, entry.name);
    const content = await readFile(fullPath, "utf8");
    const lines = content.split("\n");

    const titleLine = lines.find((line) => line.startsWith("# "));
    if (!titleLine) {
      continue;
    }

    const tag = titleLine.replace(/^#\s+/, "").trim();
    let description = "";
    let titleFound = false;
    for (const line of lines) {
      if (!titleFound) {
        if (line === titleLine) {
          titleFound = true;
        }
        continue;
      }

      const normalizedLine = line.trim();
      if (normalizedLine.length === 0) {
        continue;
      }
      if (normalizedLine.startsWith("import ")) {
        continue;
      }
      if (normalizedLine.startsWith("## ")) {
        break;
      }
      description = normalizedLine;
      break;
    }

    descriptions.set(tag, description);
  }

  return descriptions;
}

function compareByName(left, right) {
  return left.name.localeCompare(right.name);
}

export async function generateComponentApiMetadata() {
  const descriptions = await readComponentDocDescriptions();
  const components = [];

  for (const metadataFile of STATIC_COMPONENT_METADATA_FILES) {
    const absolutePath = path.join(repoRoot, metadataFile.metadataPath);
    const metadata = JSON.parse(await readFile(absolutePath, "utf8"));
    components.push(...metadata.components);
  }

  for (const sourceFile of SOURCE_FILES) {
    const absolutePath = path.join(repoRoot, sourceFile.sourcePath);
    const sourceText = await readFile(absolutePath, "utf8");
    const constants = parseStringConstants(sourceText);
    const extendsMap = parseClassExtendsMap(sourceText);
    const interfaceDetailsByName = parseDetailInterfaces(sourceText);
    const definitions = parseDefinitions(sourceText);
    const classBlockByName = new Map();
    for (const definition of definitions) {
      const classBlock = parseClassBlock(sourceText, definition.className);
      if (classBlock) {
        classBlockByName.set(definition.className, classBlock);
      }
    }

    function parseOwnClassMetadata(className) {
      const classBlock =
        classBlockByName.get(className) ?? parseClassBlock(sourceText, className) ?? "";
      const properties = parseProperties(classBlock).map((property) => ({
        name: property.name,
        type: property.type,
        default: property.default,
        options: property.options
      }));
      const observedAttributes = parseObservedAttributes(classBlock, constants);
      const events = parseEvents(classBlock, interfaceDetailsByName);

      return {
        observedAttributes,
        properties,
        events
      };
    }

    function parseClassWithInheritance(className) {
      const chain = [];
      let current = className;
      const guard = new Set();
      while (current && !guard.has(current)) {
        guard.add(current);
        chain.unshift(current);
        current = extendsMap.get(current) ?? null;
      }

      const accumulated = {
        observedAttributes: [],
        properties: [],
        events: []
      };

      for (const chainClass of chain) {
        const own = parseOwnClassMetadata(chainClass);
        accumulated.observedAttributes.push(...own.observedAttributes);
        accumulated.properties.push(...own.properties);
        accumulated.events.push(...own.events);
      }

      return {
        observedAttributes: mergeByName(
          accumulated.observedAttributes.map((name) => ({
            name
          }))
        ).map((entry) => entry.name),
        properties: mergeByName(accumulated.properties),
        events: enrichEventMetadata(mergeByName(accumulated.events), interfaceDetailsByName)
      };
    }

    for (const definition of definitions) {
      const { properties, observedAttributes, events } = parseClassWithInheritance(
        definition.className
      );
      const attributes = buildAttributes(observedAttributes, properties).sort(compareByName);

      components.push({
        tag: definition.tag,
        package: sourceFile.packageName,
        className: definition.className,
        description: descriptions.get(definition.tag) ?? "",
        attributes,
        properties: properties.sort(compareByName),
        events,
        slots: [
          {
            name: "default",
            description: "Default child content."
          }
        ]
      });
    }
  }

  components.sort((left, right) => left.tag.localeCompare(right.tag));

  return {
    schemaVersion: 1,
    components
  };
}
