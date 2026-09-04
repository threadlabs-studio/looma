import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    ui: "src/ui.ts",
    "extensions/index": "src/extensions/index.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  external: ["@tiptap/core", "@tiptap/pm", "lowlight"],
  noExternal: [/^@tiptap\/extension-/, "@tiptap/suggestion"],
});
