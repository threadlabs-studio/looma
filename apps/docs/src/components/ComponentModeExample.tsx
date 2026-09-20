import React, { useMemo } from "react";

import componentApi from "../../../../generated/component-api.json";
import {
  FrameworkModeCode,
  FrameworkModeSelector,
  type FrameworkExamples
} from "./FrameworkMode";

type ComponentRecord = (typeof componentApi.components)[number];
type ExampleValue = string | number | boolean;
type ExampleAttribute = [name: string, property: string, value: ExampleValue];

const exampleAttributeOverrides: Partial<Record<string, ExampleAttribute[]>> = {
  "ui-avatar": [["name", "name", "Maya Chen"], ["fallback", "fallback", "MC"]],
  "ui-combobox": [["label", "label", "Destination"]],
  "ui-floating-action-button": [["label", "label", "Create page"]],
  "ui-icon-button": [["label", "label", "More options"]],
  "ui-radio": [["value", "value", "pro"]],
  "ui-radio-group": [["name", "name", "plan"], ["value", "value", "pro"]],
  "ui-tree": [["label", "label", "Project pages"]],
  "ui-tree-item": [["item-id", "itemId", "roadmap"], ["label", "label", "Roadmap"]]
};

const componentByTag = new Map(componentApi.components.map((component) => [component.tag, component]));

function titleFromTag(tag: string): string {
  return tag
    .replace(/^ui-/, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function factoryFromTag(tag: string): string {
  return `create${tag.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("")}`;
}

function exampleAttributes(component: ComponentRecord): ExampleAttribute[] {
  const overrides = exampleAttributeOverrides[component.tag] ?? [];
  const overriddenNames = new Set(overrides.map(([name]) => name));
  const defaults = component.attributes
    .filter((attribute) => !overriddenNames.has(attribute.name))
    .flatMap((attribute): Array<[string, string, ExampleValue]> => {
      const option = "options" in attribute ? attribute.options[0] : undefined;
      const value = option ?? attribute.default;
      if (
        (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") ||
        value === false ||
        value === ""
      ) return [];
      return [[attribute.name, attribute.property, value]];
    });
  return [...overrides, ...defaults].slice(0, 2);
}

function reactProp(property: string, value: ExampleValue): string {
  return typeof value === "string"
    ? ` ${property}=${JSON.stringify(value)}`
    : ` ${property}={${JSON.stringify(value)}}`;
}

function vueProp(name: string, value: ExampleValue): string {
  return typeof value === "string"
    ? ` ${name}=${JSON.stringify(value)}`
    : ` :${name}=${JSON.stringify(JSON.stringify(value))}`;
}

function semanticContent(
  tag: string,
  indentation: string,
  mode: "html" | "vue" | "react" | "svelte"
): string {
  if (tag === "ui-avatar") return `${indentation}<span data-ui-avatar-fallback>MC</span>`;
  if (tag === "ui-avatar-group") return `${indentation}<ui-avatar name="Maya Chen" fallback="MC"><span data-ui-avatar-fallback>MC</span></ui-avatar>\n${indentation}<ui-avatar name="Noah Williams" fallback="NW"><span data-ui-avatar-fallback>NW</span></ui-avatar>`;
  if (tag === "ui-button") return `${indentation}<button type="button">Button</button>`;
  if (tag === "ui-checkbox") return `${indentation}<label><input type="checkbox" /> Checkbox</label>`;
  if (tag === "ui-context-menu") return `${indentation}<button slot="trigger" type="button">Actions</button>\n${indentation}<ui-menu-item value="edit">Edit</ui-menu-item>\n${indentation}<ui-menu-item value="archive">Archive</ui-menu-item>`;
  if (tag === "ui-dialog") return `${indentation}<dialog><p>Dialog content</p></dialog>`;
  if (tag === "ui-disclosure") return `${indentation}<button type="button" aria-controls="details">Details</button>\n${indentation}<div id="details">Disclosure content</div>`;
  if (tag === "ui-editable") return `${indentation}<button slot="preview" type="button" data-ui-editable-trigger>Project name</button>\n${indentation}<input slot="edit" aria-label="Project name" />`;
  if (tag === "ui-form-field") {
    const labelFor = mode === "react" ? "htmlFor" : "for";
    return `${indentation}<label ${labelFor}="email">Email</label>\n${indentation}<input id="email" type="email" />`;
  }
  if (tag === "ui-menu") return `${indentation}<ui-menu-item value="edit">Edit</ui-menu-item>\n${indentation}<ui-menu-item value="archive">Archive</ui-menu-item>`;
  if (tag === "ui-radio") return `${indentation}<label><input type="radio" /> Radio</label>`;
  if (tag === "ui-radio-group") return `${indentation}<ui-radio value="starter">Starter</ui-radio>\n${indentation}<ui-radio value="pro">Pro</ui-radio>`;
  if (tag === "ui-input") return `${indentation}<input aria-label="Input" />`;
  if (tag === "ui-search-result-row") return `${indentation}<span slot="leading" aria-hidden="true">⌘</span>\n${indentation}<span slot="title">Project brief</span>\n${indentation}<span slot="meta">Page</span>`;
  if (tag === "ui-search-shell") return `${indentation}<button slot="backdrop" type="button" aria-label="Close search"></button>\n${indentation}<div slot="search"><input type="search" aria-label="Search" /></div>\n${indentation}<div slot="body">Search results</div>\n${indentation}<div slot="footer">Enter to open</div>`;
  if (tag === "ui-select") return `${indentation}<select aria-label="Select"><option>Option</option></select>`;
  if (tag === "ui-tabs") return `${indentation}<div role="tablist" aria-label="Sections">\n${indentation}  <button role="tab" id="overview-tab" aria-controls="overview-panel">Overview</button>\n${indentation}</div>\n${indentation}<section role="tabpanel" id="overview-panel" aria-labelledby="overview-tab">Overview content</section>`;
  if (tag === "ui-textarea") return `${indentation}<textarea aria-label="Textarea"></textarea>`;
  if (tag === "ui-top-bar") return `${indentation}<button slot="leading" type="button" aria-label="Open navigation">☰</button>\n${indentation}<strong>Project Atlas</strong>\n${indentation}<button slot="actions" type="button">Share</button>`;
  if (tag === "ui-tree") return `${indentation}<ui-tree-item item-id="roadmap" label="Roadmap"><span>Roadmap</span></ui-tree-item>`;
  if (tag === "ui-tree-item") return `${indentation}<span>Roadmap</span>\n${indentation}<button slot="actions" type="button" aria-label="Page options">•••</button>`;
  return `${indentation}<span>Component content</span>`;
}

function buildExamples(component: ComponentRecord): FrameworkExamples {
  const componentName = titleFromTag(component.tag);
  const factoryName = factoryFromTag(component.tag);
  const attributes = exampleAttributes(component);
  const markupAttributes = attributes.map(([name, , value]) => ` ${name}="${String(value)}"`).join("");
  const vueProps = attributes.map(([name, , value]) => vueProp(name, value)).join("");
  const reactProps = attributes.map(([, property, value]) => reactProp(property, value)).join("");
  const objectProps = attributes.map(([, property, value]) => `${property}: ${JSON.stringify(value)}`).join(", ");
  const htmlPackage = component.package;
  const vuePackage = component.package.endsWith("/editor")
    ? "@threadlabs/looma/vue/editor"
    : "@threadlabs/looma/vue";
  return {
    "html-next": {
      language: "html",
      code: `<script type="module">
  import "${htmlPackage}";
</script>

<${component.tag}${markupAttributes}>
${semanticContent(component.tag, "  ", "html")}
</${component.tag}>`
    },
    vue: {
      language: "vue",
      code: `<script setup lang="ts">
import { ${componentName} } from "${vuePackage}";
</script>

<template>
  <${componentName}${vueProps}>
${semanticContent(component.tag, "    ", "vue")}
  </${componentName}>
</template>`
    },
    react: {
      language: "tsx",
      code: `import { ${componentName} } from "@threadlabs/looma-react";

export function Example() {
  return (
    <${componentName}${reactProps}>
${semanticContent(component.tag, "      ", "react")}
    </${componentName}>
  );
}`
    },
    svelte: {
      language: "svelte",
      code: `<script lang="ts">
  import { onMount } from "svelte";
  import { ${factoryName} } from "@threadlabs/looma-svelte";

  let host: HTMLDivElement;
  onMount(() => {
    const children = [...host.childNodes];
    host.replaceChildren(${factoryName}({${objectProps}${objectProps ? ", " : ""}children }));
  });
</script>

<div bind:this={host}>
${semanticContent(component.tag, "  ", "svelte")}
</div>`
    }
  };
}

/** Framework-specific scaffold generated from the same public component metadata as the API table. */
export function ComponentModeExample({ component }: { component: string }): JSX.Element | null {
  const record = componentByTag.get(component);
  const examples = useMemo(() => record ? buildExamples(record) : null, [record]);
  if (!record || !examples) return null;

  return (
    <div className="looma-component-mode-example">
      <div className="looma-component-mode-example__header">
        <div>
          <strong>Use it in your stack</strong>
          <span>One contract; adapter-specific lifecycle.</span>
        </div>
        <FrameworkModeSelector />
      </div>
      <FrameworkModeCode examples={examples} />
    </div>
  );
}
