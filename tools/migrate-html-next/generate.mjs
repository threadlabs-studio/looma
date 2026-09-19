import { copyFile, cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { convertShadowStyles } from "./convert-styles.mjs";
import { coreContractFor } from "./core-contracts.mjs";
import {
  reflectedBooleanAttributes,
  reflectedPropAttributes,
  renderPort,
} from "./convert-render.mjs";
import { referencedTags } from "./discover-ports.mjs";
import { rootElementFor } from "./root-element.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPOSITORY = join(HERE, "..", "..");
const CORE = join(REPOSITORY, "packages", "core", "src", "components");
const CONTROLLERS = join(HERE, "harness", "controllers");
const DEFAULT_OUTPUT = join(HERE, "generated", "core");

function addController(template, controller) {
  if (controller === undefined) return template;
  return template.replace(
    /^<template component="([^"]+)"/,
    `<template component="$1" controller="./controllers/${controller}"`,
  );
}

function addStyles(template, css, tsx, contract, tag) {
  const end = template.lastIndexOf("</template>");
  const styles = convertShadowStyles(css, {
    reflectedAttributes: reflectedPropAttributes(tsx, contract, tag),
    booleanAttributes: reflectedBooleanAttributes(tsx, contract, tag),
  });
  return `${template.slice(0, end)}  <style>${styles}</style>\n${template.slice(end)}`;
}

async function exists(path) {
  try {
    await readFile(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

export async function generateCoreArtifacts({ output = DEFAULT_OUTPUT } = {}) {
  const entries = await readdir(CORE, { withFileTypes: true });
  const tags = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const components = [];

  await rm(output, { recursive: true, force: true });
  await mkdir(join(output, "components"), { recursive: true });
  await mkdir(join(output, "components", "controllers"), { recursive: true });
  await cp(
    join(CONTROLLERS, "shared"),
    join(output, "components", "controllers", "shared"),
    { recursive: true },
  );

  for (const tag of tags) {
    const cssPath = join(CORE, tag, `${tag}.css`);
    const tsxPath = join(CORE, tag, `${tag}.tsx`);
    if (!(await exists(cssPath)) || !(await exists(tsxPath))) continue;

    const [css, tsx] = await Promise.all([
      readFile(cssPath, "utf8"),
      readFile(tsxPath, "utf8"),
    ]);
    const controllerName = `${tag}.js`;
    const controllerPath = join(CONTROLLERS, controllerName);
    const controller = await exists(controllerPath) ? controllerName : undefined;
    const contract = coreContractFor(tag);
    const rendered = renderPort(tag, tsx, rootElementFor(css), { contract });
    const definition = addStyles(addController(rendered, controller), css, tsx, contract, tag);
    const dependencies = [...new Set([
      ...referencedTags(definition),
      ...referencedTags(tsx),
      ...contract.dependencies,
    ])]
      .filter((dependency) => dependency !== tag)
      .sort();
    const links = dependencies
      .map((dependency) => `<link rel="component" href="./${dependency}.html">`)
      .join("\n");
    const source = links === "" ? `${definition}\n` : `${links}\n${definition}\n`;

    await writeFile(join(output, "components", `${tag}.html`), source);
    if (controller !== undefined) {
      await copyFile(controllerPath, join(output, "components", "controllers", controller));
    }
    components.push({ tag, controller: controller ?? null, dependencies });
  }

  const manifest = {
    schemaVersion: 1,
    source: "packages/core/src/components",
    components,
  };
  await writeFile(join(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

async function main() {
  const outputArgument = process.argv.find((argument) => argument.startsWith("--output="));
  const output = outputArgument
    ? join(process.cwd(), outputArgument.slice("--output=".length))
    : DEFAULT_OUTPUT;
  const manifest = await generateCoreArtifacts({ output });
  console.log(
    `Generated ${manifest.components.length} HTML Next core definitions in ${relative(REPOSITORY, output)}`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
