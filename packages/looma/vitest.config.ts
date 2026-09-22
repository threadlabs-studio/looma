import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "tests/**/*.browser.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
