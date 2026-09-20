import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "browser",
    browser: {
      enabled: true,
      provider: "playwright",
      headless: true,
      instances: [{ browser: "chromium" }],
    },
    setupFiles: ["./test/setup.ts"],
    include: ["src/declarative-adoption.browser.test.ts", "src/input-modality.browser.test.ts"],
  },
});
