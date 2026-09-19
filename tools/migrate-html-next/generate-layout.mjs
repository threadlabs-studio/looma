import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { convertLightDomStyles } from "./convert-light-dom.mjs";
import { layoutContracts } from "./layout-contracts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPOSITORY = join(HERE, "..", "..");
const CONTROLLERS = join(HERE, "harness", "controllers");
const DEFAULT_OUTPUT = join(HERE, "generated", "layout");

function escapeAttribute(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function definitionFor(tag, contract, controller) {
  const props = Object.entries(contract.props).map(([name, declaration]) => {
    const defaultValue = Object.hasOwn(declaration, "default")
      ? ` default="${escapeAttribute(declaration.default)}"`
      : "";
    return `    <prop name="${name}" type="${declaration.type}"${defaultValue}>${name} token.</prop>`;
  });
  const events = contract.events.map(({ name, type }) =>
    `    <event name="${name}" type="${type}"></event>`);
  const controllerAttribute = controller ? ` controller="./controllers/${controller}"` : "";
  return `<template component="${tag}" status="early" summary="Looma ${tag} layout primitive."${controllerAttribute}>
  <defs>
${[...props, ...events].join("\n")}
  </defs>
  <${contract.root}><slot></slot></${contract.root}>
</template>\n`;
}

export async function generateLayoutArtifacts({ output = DEFAULT_OUTPUT } = {}) {
  await rm(output, { recursive: true, force: true });
  await mkdir(join(output, "components", "controllers"), { recursive: true });
  const components = [];
  for (const [tag, contract] of Object.entries(layoutContracts)) {
    const controller = ["ui-sidebar", "ui-reel", "ui-separator"].includes(tag) ? `${tag}.js` : null;
    await writeFile(join(output, "components", `${tag}.html`), definitionFor(tag, contract, controller));
    if (controller) await copyFile(join(CONTROLLERS, controller), join(output, "components", "controllers", controller));
    components.push({ tag, controller, dependencies: [] });
  }
  const css = await readFile(join(REPOSITORY, "packages", "layout", "src", "layout.css"), "utf8");
  await writeFile(join(output, "styles.css"), convertLightDomStyles(css, { contracts: layoutContracts }));
  const manifest = { schemaVersion: 1, source: "packages/layout/src", components };
  await writeFile(join(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  generateLayoutArtifacts().then((manifest) => {
    console.log(`Generated ${manifest.components.length} HTML Next layout definitions in ${relative(REPOSITORY, DEFAULT_OUTPUT)}`);
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
