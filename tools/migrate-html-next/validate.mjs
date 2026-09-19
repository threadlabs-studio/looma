import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const generatedPackages = ["core", "layout", "editor"].map((name) => join(HERE, "generated", name));
const manifests = await Promise.all(generatedPackages.map(async (directory) => ({
  directory,
  manifest: JSON.parse(await readFile(join(directory, "manifest.json"), "utf8")),
})));
const components = manifests.flatMap(({ directory, manifest }) =>
  manifest.components.map((component) => ({ ...component, directory })));
const runtime = await readFile(join(HERE, "vendor", "html-next-runtime.iife.js"), "utf8");
const definitions = (await Promise.all(components.map(async ({ tag, directory }) =>
  readFile(join(directory, "components", `${tag}.html`), "utf8"))))
  .map((source) => source.replace(/^<link\s+rel="component"[^>]*>\s*$/gm, ""))
  .join("\n");
const invocations = components.map(({ tag }) => `<${tag}></${tag}>`).join("\n");

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.setContent(`<!doctype html><meta charset="utf-8">${definitions}${invocations}`);
  await page.addScriptTag({ content: runtime });
  const result = await page.evaluate((tags) => {
    let passes = 0;
    let lowered;
    do {
      lowered = window.HtmlRuntime.lowerDocument(document);
      passes += 1;
    } while (lowered > 0 && passes < 20);
    return {
      passes,
      missing: tags.filter((tag) => !document.querySelector(`[data-component-root~="${tag}"]`)),
    };
  }, components.map(({ tag }) => tag));
  if (errors.length) throw new Error(`HTML Next runtime rejected the graph:\n${errors.join("\n")}`);
  if (result.missing.length) throw new Error(`Components did not lower: ${result.missing.join(", ")}`);
  console.log(`Validated ${components.length} standalone HTML Next definitions in ${result.passes} lowering passes.`);
} finally {
  await browser.close();
}
