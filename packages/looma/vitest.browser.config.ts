import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

// Browser-mode tests of the editor. They import the built package (run `pnpm build` first).
export default defineConfig({
  plugins: [vue()],
  test: {
    include: [
      "tests/looma-editor-active-block.browser.test.ts",
      "tests/looma-editor-history.browser.test.ts",
      "tests/looma-editor-mention.browser.test.ts",
      "tests/mention-typing.browser.test.ts",
    ],
    browser: { enabled: true, provider: "playwright", headless: true, instances: [{ browser: "chromium" }] },
  },
});
