import { configDefaults, defineConfig } from "vitest/config";
import { vueSourcePlugins } from "./tests/framework-plugins";

export default defineConfig({
  test: {
    fileParallelism: process.env.CI ? undefined : false,
    maxWorkers: process.env.CI ? undefined : 1,
    exclude: [...configDefaults.exclude, "tests/**/*.browser.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/**/*.test.ts"],
          exclude: [...configDefaults.exclude, "tests/**/*.browser.test.ts", "tests/**/*ssr.test.ts", "tests/browser.test.ts", "tests/tree.test.ts", "tests/editor-table.test.ts"],
        },
      },
      {
        extends: true,
        plugins: vueSourcePlugins(),
        test: {
          name: "vue-source",
          include: ["tests/**/*ssr.test.ts", "tests/browser.test.ts", "tests/tree.test.ts", "tests/editor-table.test.ts"],
        },
      },
    ],
  },
});
