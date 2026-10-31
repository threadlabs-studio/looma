import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { discoverComponents } from "../../packages/looma/tooling/docs/catalog.mjs";
import { frameworkExamples } from "../../packages/looma/tooling/docs/framework-examples.mjs";

// Convert authored examples during the build, keeping the compiler out of the browser bundle.
const { components } = await discoverComponents({
  root: fileURLToPath(new URL("../../", import.meta.url)),
  directory: "packages/looma/src/components",
  packageName: "@threadlabs/looma",
});
for (const component of components) {
  component.importSource = component.package;
  component.resource = `${component.package}/components/${component.tag}/${component.tag}.html`;
}
const examples = Object.fromEntries(components.flatMap((component) =>
  component.examples.map((example) => [`${component.tag}/${example.name}`, frameworkExamples(example, components)])
));
const model = frameworkExamples({ markup: await readFile(new URL("model-example.html", import.meta.url), "utf8") }, components);
const generated = new URL("../../generated/", import.meta.url);
await mkdir(generated, { recursive: true });
await writeFile(new URL("framework-examples.json", generated), JSON.stringify({ model, examples }));

// Use the package's build tool and built exports, just as the docs site does.
const require = createRequire(new URL("../../packages/looma/package.json", import.meta.url));
const { build } = await import(require.resolve("vite"));
await build({
  configFile: false,
  logLevel: "warn",
  root: fileURLToPath(new URL("../../packages/looma", import.meta.url)),
  build: {
    outDir: fileURLToPath(new URL("static/preview-runtime", import.meta.url)),
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL("src/preview-runtime.ts", import.meta.url)),
      formats: ["iife"],
      name: "LoomaPreview",
      fileName: () => "runtime.js",
      cssFileName: "runtime",
    },
  },
});

const assets = new URL("static/_looma/", import.meta.url);
await mkdir(assets, { recursive: true });
for (const file of ["portrait.svg", "pastoral.svg"]) await cp(new URL(`../../packages/looma/tooling/docs/${file}`, import.meta.url), new URL(file, assets));
