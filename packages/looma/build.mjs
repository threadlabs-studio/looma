// Builds the published package from src/.
//
// HTML Next assembles source definitions, controllers and native runtime support.
// Framework conversion belongs to the consuming application’s Vite plugin.
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { assembleComponentPackage } from "@nextwebwg/html-next";
import { build } from "vite";

import { assertStyleSources } from "../../tools/scripts/style-source-policy.mjs";
await assertStyleSources();
const { assertComponentLayoutOwnership } = await import("../../tools/scripts/component-style-ownership.mjs");
await assertComponentLayoutOwnership();

const root = dirname(fileURLToPath(import.meta.url));
const assembled = join(root, ".build");
const outputs = ["dist", "vue", "vanilla", "components", "styles", "editor", "markdown"];

await Promise.all([assembled, ...outputs.map((name) => join(root, name))].map((path) => rm(path, { recursive: true, force: true })));

const componentsRoot = join(root, "src/components");
const tags = (await readdir(componentsRoot)).filter((name) => name.startsWith("ui-")).sort();
const { components } = await assembleComponentPackage({
  name: "@threadlabs/looma",
  version: "0.0.0",
  outDirectory: assembled,
  components: tags.map((tag) => ({ source: join(componentsRoot, tag, `${tag}.html`) })),
});

// Publish the authored definitions and their native support; framework outputs stay unshipped.
for (const name of ["dist", "vanilla", "components", "styles"]) {
  await cp(join(assembled, name), join(root, name), { recursive: true }).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
}

// Framework code is compiled by the consumer's HTML Next Vite plugin. The package
// ships its definitions, native runtime/factories and framework-neutral editor helpers.
const isDependency = (id) => id === "lowlight" || id === "expressmark" || id.startsWith("@nextwebwg/html-next")
  || (id.startsWith("@threadlabs/looma/") && !id.startsWith("@threadlabs/looma/vanilla/")) ||
  /^@tiptap\/(core|pm)(\/|$)/.test(id) || id.startsWith("lucide");

// The editor's framework-neutral contracts and Tiptap extensions.
await build({
  configFile: false,
  logLevel: "warn",
  root,
  build: {
    outDir: join(root, "editor"),
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: {
        index: join(root, "src/editor/index.ts"),
        ui: join(root, "src/editor/ui.ts"),
        compact: join(root, "src/editor/compact.ts"),
        expressmark: join(root, "src/editor/expressmark.ts"),
        "extensions/index": join(root, "src/editor/extensions/index.ts"),
      },
      formats: ["es"],
      cssFileName: "components",
    },
    rollupOptions: { external: isDependency, output: { entryFileNames: "[name].js", chunkFileNames: "chunks/[name].js" } },
  },
});
// Looma Markdown: its rules and the fixtures, whose files are bundled as strings.
await build({
  configFile: false,
  logLevel: "warn",
  root,
  build: {
    outDir: join(root, "markdown"),
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: {
        index: join(root, "src/markdown/index.ts"),
        fixtures: join(root, "src/markdown/fixtures.ts"),
      },
      formats: ["es"],
    },
    rollupOptions: { external: isDependency, output: { entryFileNames: "[name].js", chunkFileNames: "chunks/[name].js" } },
  },
});
// Declarations for the framework-neutral TypeScript entries.
execFileSync(join(root, "node_modules/.bin/tsc"), ["-p", join(root, "tsconfig.json")], { stdio: "inherit" });
// Publish the shared browser initializer with declarations derived from its JSDoc source.
execFileSync(join(root, "node_modules/.bin/tsc"), [
  "--allowJs", "--declaration", "--emitDeclarationOnly", "--target", "ES2022", "--module", "ESNext",
  "--lib", "ES2022,DOM", "--outDir", join(assembled, "shared-types"),
  join(componentsRoot, "shared/input-modality.js"),
], { stdio: "inherit" });
await cp(join(assembled, "shared-types/input-modality.d.ts"), join(root, "components/shared/input-modality.d.ts"));
await cp(join(assembled, "types-src/editor"), join(root, "editor"), { recursive: true });
await cp(join(assembled, "types-src/markdown"), join(root, "markdown"), { recursive: true });
// Node-resolved consumers need explicit extensions in declaration imports.
for (const directory of ["editor", "markdown"]) {
  for (const file of await readdir(join(root, directory), { recursive: true })) {
    if (!file.endsWith(".d.ts")) continue;
    const path = join(root, directory, file);
    const source = await readFile(path, "utf8");
    const rewritten = source.replace(/(from |import\()"(\.{1,2}\/[^"]*?)"/g, (match, lead, specifier) => {
      if (/\.js$/.test(specifier)) return match;
      const base = resolve(dirname(path), specifier);
      return `${lead}"${specifier}${existsSync(`${base}.d.ts`) ? ".js" : "/index.js"}"`;
    });
    if (rewritten !== source) await writeFile(path, rewritten);
  }
}

for (const file of await readdir(join(root, "src/tokens"))) {
  await cp(join(root, "src/tokens", file), join(root, file));
}
await mkdir(join(root, "dist"), { recursive: true });
const { buildDocsCatalog } = await import("../../tools/scripts/build-docs-catalog.mjs");
await buildDocsCatalog();
console.log(`Built ${components.length} components and their documentation catalog.`);
