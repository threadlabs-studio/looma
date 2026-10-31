import { defineConfig } from "vite";
import htmlNext from "@nextwebwg/html-next-unplugin/vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [htmlNext({ target: "vue", declarationsFile: "src/html-next.d.ts" }), vue()],
  build: { ssr: "src/index.ts", outDir: "dist", rollupOptions: { output: { entryFileNames: "index.js" } } },
});
