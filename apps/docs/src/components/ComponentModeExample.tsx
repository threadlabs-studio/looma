import React, { useMemo } from "react";

import componentApi from "../../../../generated/component-api.json";
import {
  FrameworkModeCode,
  FrameworkModeSelector,
  type FrameworkExamples
} from "./FrameworkMode";

type ComponentRecord = (typeof componentApi.components)[number];

export interface ScenarioPropertyAssignment {
  elementId: string;
  property: string;
  variable: string;
  value: unknown;
}

/**
 * Props are HTML attributes: writes each assigned value onto its element in the markup, using the
 * attribute's kebab-case name and JSON text for lists and records. Used for the HTML example and the
 * live preview; framework examples bind the same values as ordinary component props instead.
 */
export function withPropertyAttributes(
  markup: string,
  assignments: readonly ScenarioPropertyAssignment[]
): string {
  const escape = (text: string) => text.replaceAll("&", "&amp;").replaceAll("'", "&#39;");
  return assignments.reduce((source, assignment) => {
    const name = assignment.property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    const text = typeof assignment.value === "string" ? assignment.value : JSON.stringify(assignment.value);
    return source.replace(
      `id="${assignment.elementId}"`,
      `id="${assignment.elementId}" ${name}='${escape(text)}'`
    );
  }, markup);
}

const componentByTag = new Map(componentApi.components.map((component) => [component.tag, component]));
const voidElements = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

function publicName(tag: string): string {
  return tag
    .replace(/^ui-/, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function tagsIn(markup: string): string[] {
  return Array.from(new Set(Array.from(markup.matchAll(/<(ui-[a-z0-9-]+)/g), (match) => match[1])));
}

/**
 * Formats repository-owned scenario fragments for display. This intentionally
 * is not a general HTML parser: scenarios contain no raw-text elements, and
 * the void-element set is the only nesting exception they need.
 */
function formatMarkup(markup: string): string {
  const tokens = markup.replace(/>\s*</g, "><").split(/(?=<)|(?<=>)/).map((token) => token.trim()).filter(Boolean);
  const lines: string[] = [];
  let depth = 0;

  for (const token of tokens) {
    if (token.startsWith("</")) depth = Math.max(0, depth - 1);
    lines.push(`${"  ".repeat(depth)}${token}`);
    const openingTag = token.match(/^<([a-z][\w-]*)\b/i)?.[1]?.toLowerCase();
    if (openingTag && !token.startsWith("</") && !token.endsWith("/>") && !voidElements.has(openingTag)) {
      depth += 1;
    }
  }

  return lines.join("\n");
}

function importPackages(tags: string[]): string[] {
  return Array.from(new Set(tags.map((tag) => componentByTag.get(tag)?.package).filter((value): value is string => Boolean(value))));
}

function renameComponents(markup: string): string {
  return tagsIn(markup).reduce((source, tag) => {
    const name = publicName(tag);
    return source.replaceAll(`<${tag}`, `<${name}`).replaceAll(`</${tag}>`, `</${name}>`);
  }, markup);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function reactStyle(value: string): string {
  const entries = value.split(";").map((declaration) => declaration.trim()).filter(Boolean).map((declaration) => {
    const separator = declaration.indexOf(":");
    const rawName = declaration.slice(0, separator).trim();
    const rawValue = declaration.slice(separator + 1).trim();
    const name = rawName.startsWith("--")
      ? JSON.stringify(rawName)
      : rawName.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
    const valueExpression = /^-?\d+(?:\.\d+)?$/.test(rawValue) ? rawValue : JSON.stringify(rawValue);
    return `${name}: ${valueExpression}`;
  });
  return `style={{ ${entries.join(", ")} }}`;
}

/**
 * Uses the generated public API as the source of truth for React prop names
 * and scalar types, keeping adapter snippets aligned with the shipped wrappers.
 */
function transformReactComponentAttributes(source: string, record: ComponentRecord): string {
  const name = publicName(record.tag);
  return source.replace(new RegExp(`<${record.tag}(?<attributes>[^>]*)>`, "g"), (...args: unknown[]) => {
    const groups = args.at(-1) as { attributes?: string } | undefined;
    let attributes = String(groups?.attributes ?? "");
    for (const attribute of [...record.attributes].sort((a, b) => b.name.length - a.name.length)) {
      const token = new RegExp(`(^|\\s)${escapeRegExp(attribute.name)}(?=(?:=|\\s|$))`, "g");
      attributes = attributes.replace(token, `$1${attribute.property}`);
      const value = new RegExp(`\\b${escapeRegExp(attribute.property)}="([^"]*)"`, "g");
      attributes = attributes.replace(value, (_attribute, rawValue: string) => {
        if (attribute.type === "boolean") return `${attribute.property}={${rawValue !== "false"}}`;
        if (attribute.type === "number") return `${attribute.property}={${rawValue}}`;
        return `${attribute.property}=${JSON.stringify(rawValue)}`;
      });
    }
    return `<${name}${attributes}>`;
  }).replaceAll(`</${record.tag}>`, `</${name}>`);
}

function reactMarkup(markup: string): string {
  let result = tagsIn(markup).reduce((source, tag) => {
    const record = componentByTag.get(tag);
    return record ? transformReactComponentAttributes(source, record) : source;
  }, markup);
  result = result
    .replace(/\bclass=/g, "className=")
    .replace(/(<label\b[^>]*?)\bfor=/g, "$1htmlFor=")
    .replace(/\btabindex=/g, "tabIndex=")
    .replace(/\breadonly\b/g, "readOnly")
    .replace(/\bstroke-width=/g, "strokeWidth=")
    .replace(/\bpopovertarget=/g, "popoverTarget=")
    .replace(/style="([^"]*)"/g, (_match, value: string) => reactStyle(value));
  return result;
}

function valueCode(value: unknown, indent = ""): string {
  return JSON.stringify(value, null, 2).split("\n").map((line, index) =>
    index === 0 ? line : `${indent}${line}`
  ).join("\n");
}

function bindProperties(
  markup: string,
  assignments: readonly ScenarioPropertyAssignment[],
  mode: "vue" | "react" | "svelte"
): string {
  return assignments.reduce((source, assignment) => {
    const syntax = mode === "vue"
      ? `:${assignment.property}="${assignment.variable}"`
      : mode === "react"
        ? `${assignment.property}={${assignment.variable}}`
        : `${assignment.property}={${assignment.variable}}`;
    return source.replace(
      `id="${assignment.elementId}"`,
      `id="${assignment.elementId}" ${syntax}`
    );
  }, markup);
}

/**
 * Preserves each scenario's declarative light-DOM contract in every mode.
 * Framework variants change registration and binding syntax only; they do not
 * substitute a generic example or invent framework-specific behavior.
 */
function buildExamples(
  markup: string,
  assignments: readonly ScenarioPropertyAssignment[]
): FrameworkExamples {
  const tags = tagsIn(markup);
  const packages = importPackages(tags);
  const htmlImports = packages.map((packageName) => `  import ${JSON.stringify(packageName)};`).join("\n");
  const vueGroups = new Map<string, string[]>();
  for (const tag of tags) {
    const packageName = tag.startsWith("ui-editor-") ? "@threadlabs/looma/vue/editor" : "@threadlabs/looma/vue";
    vueGroups.set(packageName, [...(vueGroups.get(packageName) ?? []), publicName(tag)]);
  }
  const vueImports = Array.from(vueGroups.entries()).map(([packageName, names]) =>
    `import { ${names.sort().join(", ")} } from ${JSON.stringify(packageName)};`
  ).join("\n");
  const names = tags.map(publicName).sort();
  const declarations = assignments.map((assignment) =>
    `const ${assignment.variable} = ${valueCode(assignment.value)};`
  ).join("\n");
  const vue = formatMarkup(bindProperties(renameComponents(markup), assignments, "vue"));
  const react = formatMarkup(bindProperties(reactMarkup(markup), assignments, "react"));
  const svelte = formatMarkup(bindProperties(markup, assignments, "svelte"));
  const html = formatMarkup(withPropertyAttributes(markup, assignments));
  const htmlSetup = "";
  const frameworkSetup = assignments.length > 0 ? `${declarations}\n` : "";

  return {
    "html-next": {
      language: "html",
      code: `<script type="module">\n${htmlImports}${htmlSetup}\n</script>\n\n${html}`
    },
    vue: {
      language: "vue",
      code: `<script setup lang="ts">\n${vueImports}\n${frameworkSetup}</script>\n\n<template>\n${vue.split("\n").map((line) => `  ${line}`).join("\n")}\n</template>`
    },
    react: {
      language: "tsx",
      code: `import { ${names.join(", ")} } from "@threadlabs/looma/react";\n\nexport function Example() {\n${frameworkSetup.split("\n").filter(Boolean).map((line) => `  ${line}`).join("\n")}${frameworkSetup ? "\n" : ""}  return (\n${react.split("\n").map((line) => `    ${line}`).join("\n")}\n  );\n}`
    },
    svelte: {
      language: "svelte",
      code: `<script lang="ts">\n${packages.map((packageName) => `  import ${JSON.stringify(packageName)};`).join("\n")}\n${frameworkSetup}</script>\n\n${svelte}`
    }
  };
}

/**
 * Keeps implementation code beside the live result it creates. All four
 * snippets derive from the scenario markup, so editing an example cannot leave
 * behind a detached, generic framework sample that demonstrates something else.
 */
export function ScenarioModeExample({
  markup,
  propertyAssignments = [],
  examples
}: {
  markup: string;
  propertyAssignments?: readonly ScenarioPropertyAssignment[];
  examples?: FrameworkExamples;
}): JSX.Element {
  const resolvedExamples = useMemo(
    () => examples ?? buildExamples(markup, propertyAssignments),
    [examples, markup, propertyAssignments]
  );

  return (
    <div className="looma-component-mode-example">
      <div className="looma-component-mode-example__header">
        <strong>Code</strong>
        <FrameworkModeSelector />
      </div>
      <FrameworkModeCode examples={resolvedExamples} />
    </div>
  );
}
