import { RendererSequencer } from "./tests/renderer-sequencer.ts";
import { configDefaults, defineConfig } from "vitest/config";
import { rendererPlugins, rendererCacheDirectory } from "./tests/framework-plugins.ts";

export default defineConfig({
  cacheDir: rendererCacheDirectory(),
  test: {
    fsModuleCachePath: rendererCacheDirectory("-modules"),
    fileParallelism: process.env.CI ? undefined : false,
    maxWorkers: process.env.CI ? undefined : 1,
    exclude: [...configDefaults.exclude, "tests/**/*.browser.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    projects: [
      {
        cacheDir: rendererCacheDirectory(),
        extends: true,
        test: {
          name: "unit",
          include: ["tests/**/*.test.ts"],
          exclude: [...configDefaults.exclude, "tests/**/*.browser.test.ts", "tests/**/*ssr.test.ts", "tests/browser/**/*.test.ts", "tests/tree.test.ts", "tests/editor-table.test.ts"],
        },
      },
      {
        cacheDir: rendererCacheDirectory(),
        extends: true,
        plugins: rendererPlugins(),
        test: {
          name: "converted-source",
          sequence: { sequencer: RendererSequencer },
          setupFiles: ["./tests/renderers/test-context.ts"],
          globalSetup: ["./tests/renderers/browser-suite.ts"],
          include: ["tests/**/*ssr.test.ts", "tests/browser/**/*.test.ts", "tests/tree.test.ts", "tests/editor-table.test.ts"],
        },
      },
    ],
  },
});
