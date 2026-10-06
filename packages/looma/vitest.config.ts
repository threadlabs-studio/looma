import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: process.env.CI ? undefined : false,
    maxWorkers: process.env.CI ? undefined : 1,
    include: ["tests/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "tests/**/*.browser.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
