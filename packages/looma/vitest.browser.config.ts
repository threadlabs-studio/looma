import { vueSourcePlugins } from "./tests/framework-plugins";
import { defineConfig } from "vitest/config";

// Browser-mode tests of the editor. They import the built package (run `pnpm build` first).
export default defineConfig({
  plugins: vueSourcePlugins(),
  define: { __LOOMA_EDITOR_TARGET__: JSON.stringify(process.env.LOOMA_EDITOR_TARGET ?? "vue") },
  optimizeDeps: { include: ["vue", "@tiptap/core"] },
  resolve: {
    dedupe: ["vue", "@vue/shared", "@vue/runtime-core", "@vue/runtime-dom", "@vue/reactivity"],
    alias: [
      { find: /^vue$/, replacement: new URL("./node_modules/vue/dist/vue.runtime.esm-bundler.js", import.meta.url).pathname },
      { find: /^@threadlabs\/looma\/editor$/, replacement: new URL("./src/editor/index.ts", import.meta.url).pathname },
      { find: /^@threadlabs\/looma\/editor\/compact$/, replacement: new URL("./src/editor/compact.ts", import.meta.url).pathname },
    ],
  },
  test: {
    include: [
      "tests/source-editor.browser.test.ts",
      "tests/native-editor.browser.test.ts",
      "tests/pagination.browser.test.ts",
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
      "tests/looma-editor-footnote.browser.test.ts",
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
