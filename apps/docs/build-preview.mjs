import { cp, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

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
