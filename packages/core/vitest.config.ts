import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    exclude: [...configDefaults.exclude, "src/**/*.browser.test.ts"]
  }
});
