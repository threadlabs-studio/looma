import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { convertLightDomStyles } from "./convert-light-dom.mjs";
import { editorContracts } from "./editor-contracts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPOSITORY = join(HERE, "..", "..");
const CONTROLLERS = join(HERE, "harness", "controllers");
const DEFAULT_OUTPUT = join(HERE, "generated", "editor");

function escapeAttribute(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function definitionFor(tag, contract) {
  const props = Object.entries(contract.props).map(([name, declaration]) => {
    const defaultValue = Object.hasOwn(declaration, "default")
      ? ` default="${escapeAttribute(declaration.default)}"`
      : "";
    return `    <prop name="${name}" type="${declaration.type}"${defaultValue}>${name} value.</prop>`;
  });
  const events = contract.events.map(({ name, type }) =>
    `    <event name="${name}" type="${type}"></event>`);
  const propertyBindings = Object.entries(contract.props)
    .filter(([, declaration]) =>
      declaration.channel === "property"
      || /\b(?:unknown|function|trusted-html|trusted-script)\b/.test(declaration.type))
    .map(([name]) => ` .${name}="${name}"`)
    .join("");
  const body = contract.slots.includes("default")
    ? `<${contract.root}${propertyBindings}><slot></slot></${contract.root}>`
    : `<${contract.root}${propertyBindings}></${contract.root}>`;
  return `<template component="${tag}" status="early" summary="Looma ${tag} editor surface." controller="./controllers/${tag}.js">
  <defs>
${[...props, ...events].join("\n")}
  </defs>
  ${body}
</template>\n`;
}

export async function generateEditorArtifacts({ output = DEFAULT_OUTPUT } = {}) {
  await rm(output, { recursive: true, force: true });
  await mkdir(join(output, "components", "controllers", "shared"), { recursive: true });
  const components = [];
  for (const [tag, contract] of Object.entries(editorContracts)) {
    await writeFile(join(output, "components", `${tag}.html`), definitionFor(tag, contract));
    await copyFile(join(CONTROLLERS, `${tag}.js`), join(output, "components", "controllers", `${tag}.js`));
    components.push({ tag, controller: `${tag}.js`, dependencies: [] });
  }
  await copyFile(join(CONTROLLERS, "shared", "editor.js"), join(output, "components", "controllers", "shared", "editor.js"));
  const css = await readFile(join(REPOSITORY, "packages", "editor", "src", "editor.css"), "utf8");
  await writeFile(join(output, "styles.css"), convertLightDomStyles(css, { contracts: editorContracts }));
  const manifest = { schemaVersion: 1, source: "packages/editor/src", components };
  await writeFile(join(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  generateEditorArtifacts().then((manifest) => {
    console.log(`Generated ${manifest.components.length} HTML Next editor definitions in ${relative(REPOSITORY, DEFAULT_OUTPUT)}`);
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
