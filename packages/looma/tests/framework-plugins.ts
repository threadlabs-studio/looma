import { fileURLToPath } from "node:url";
import htmlNext from "@nextwebwg/html-next-unplugin/vite";
import vue from "@vitejs/plugin-vue";

// Exercise dependency discovery exactly as an application importing the package does.
export function vueSourcePlugins() {
  return [htmlNext({
    target: "vue",
    root: fileURLToPath(new URL("../../../tests/framework-consumer/", import.meta.url)),
    declarationsFile: "node_modules/.html-next/consumer.d.ts",
  }), vue()];
}
