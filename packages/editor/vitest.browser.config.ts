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
    include: [
      "test/declarative-ui.browser.spec.ts",
      "test/mention-typing.browser.spec.ts",
    ],
  },
});
