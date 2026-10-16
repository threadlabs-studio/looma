import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

// Browser-mode tests of the editor. They import the built package (run `pnpm build` first).
export default defineConfig({
  plugins: [vue()],
  test: {
    include: [
      "tests/badge-overlay.browser.test.ts",
      "tests/compact-editor.browser.test.ts",
      "tests/looma-editor-selection-actions.browser.test.ts",
      "tests/looma-editor-active-block.browser.test.ts",
      "tests/looma-editor-history.browser.test.ts",
      "tests/looma-editor-markdown.browser.test.ts",
      "tests/markdown-accessibility.browser.test.ts",
      "tests/looma-editor-mention.browser.test.ts",
      "tests/looma-editor-node-views.browser.test.ts",
      "tests/looma-editor-requests.browser.test.ts",
      "tests/looma-editor-chip.browser.test.ts",
      "tests/looma-editor-table-layout.browser.test.ts",
      "tests/looma-editor-task-items.browser.test.ts",
      "tests/mention-typing.browser.test.ts",
    ],
    browser: {
      enabled: true,
      provider: "playwright",
      headless: true,
      instances: [{ browser: "chromium" }],
      // Failure screenshots are evidence for one run, kept out of the tests folder and out of Git.
      screenshotDirectory: "test-results/browser",
    },
  },
});
