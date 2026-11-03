import { RendererSequencer } from "./tests/renderer-sequencer.ts";
import { readFileSync } from "node:fs";
import path from "node:path";
import { prepareLibrary } from "./tests/renderers/prepare-library.ts";
import { browserTestPatterns } from "./tests/browser-files.mjs";
import { playwright } from "@vitest/browser-playwright";
import { rendererDependencies, rendererPlugins, rendererCacheDirectory } from "./tests/framework-plugins.ts";
import { defineConfig } from "vitest/config";

const target = process.env.LOOMA_TEST_TARGET ?? "vue";
if (!process.env.LOOMA_PREPARED_LIBRARY) {
  process.env.LOOMA_PREPARED_LIBRARY = await prepareLibrary();
  process.env.LOOMA_PREPARED_LIBRARY_OWNER = process.env.LOOMA_PREPARED_LIBRARY;
}
const prepared = JSON.parse(readFileSync(path.join(process.env.LOOMA_PREPARED_LIBRARY, "manifest.json"), "utf8"));

// Browser-mode tests of the editor. They import the built package (run `pnpm build` first).
export default defineConfig({
  cacheDir: rendererCacheDirectory(),
  plugins: rendererPlugins(),
  define: { "process.env.LOOMA_CAPTURE_ARTIFACTS": JSON.stringify(process.env.LOOMA_CAPTURE_ARTIFACTS ?? ""), __LOOMA_EDITOR_TARGET__: JSON.stringify(process.env.LOOMA_EDITOR_TARGET ?? "converted") },
  optimizeDeps: { entries: browserTestPatterns, exclude: ["svelte", "@nextwebwg/html-next", "@nextwebwg/html-next/generated-runtime", "@nextwebwg/html-next/runtime"], include: [...prepared.clientDependencies, "postcss/lib/tokenize", "@tiptap/core", ...rendererDependencies] },
  resolve: {
    dedupe: target === "vue" ? ["vue", "@vue/shared", "@vue/runtime-core", "@vue/runtime-dom", "@vue/reactivity"] : target === "react" ? ["react", "react-dom"] : target === "preact" ? ["preact"] : target === "svelte" ? ["svelte"] : [],
    alias: [
      ...(target === "vue" ? [{ find: /^vue$/, replacement: new URL("./node_modules/vue/dist/vue.runtime.esm-bundler.js", import.meta.url).pathname }] : []),
      { find: /^@threadlabs\/looma\/editor$/, replacement: new URL("./src/editor/index.ts", import.meta.url).pathname },
      { find: /^@threadlabs\/looma\/editor\/compact$/, replacement: new URL("./src/editor/compact.ts", import.meta.url).pathname },
    ],
  },
  test: {
    sequence: { sequencer: RendererSequencer },
    fsModuleCachePath: rendererCacheDirectory("-modules"),
    fileParallelism: process.env.CI ? undefined : false,
    globalSetup: ["./tests/renderers/prepare-library.ts"],
    include: browserTestPatterns,
    browser: {
      enabled: true,
      provider: playwright(process.env.LOOMA_BROWSER_ENDPOINT ? { connectOptions: { wsEndpoint: process.env.LOOMA_BROWSER_ENDPOINT } } : {}),
      headless: true,
      instances: [{ browser: "chromium" }],
      // Failure screenshots are evidence for one run, kept out of the tests folder and out of Git.
      screenshotDirectory: "test-results/browser",
    },
  },
});
