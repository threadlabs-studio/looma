import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import installedHtmlNext from "@nextwebwg/html-next-unplugin/vite";
import vue from "@vitejs/plugin-vue";
import react from "@vitejs/plugin-react";
import preact from "@preact/preset-vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { sdkAliases } from "./sdk-aliases.ts";


export const target = process.env.LOOMA_TEST_TARGET ?? "vue";
if (!["html-next", "vue", "react", "preact", "svelte", "angular"].includes(target)) throw new Error(`Unknown Looma test renderer: ${target}`);
const local = process.env.LOOMA_HTMLNEXT_ROOT;
const htmlNext = local ? (await import(pathToFileURL(path.join(local, "packages/html-next-unplugin/dist/vite.js")).href)).default : installedHtmlNext;
export function libraryPlugins() {
  return [
    { name: "looma-angular-server", resolveId(id: string, _importer: unknown, options: { ssr?: boolean }) { if (id === "@looma-test/angular-server") return options?.ssr ? fileURLToPath(new URL("./angular-server.ts", import.meta.url)) : "\0looma-angular-server-client"; }, load(id: string) { if (id === "\0looma-angular-server-client") return 'export async function renderAngularHTML() { throw new Error("Server rendering requires the server library."); }'; } },
    { name: "looma-sdk-runtime", config: () => ({ resolve: { alias: sdkAliases() } }) },
    ...(target === "html-next" ? [htmlNext({ hydrate: true, root: fileURLToPath(new URL("../../../../tests/framework-consumer/", import.meta.url)) })] : [htmlNext({ target, root: fileURLToPath(new URL("../../../../tests/framework-consumer/", import.meta.url)), declarationsFile: `node_modules/.html-next/${target}-consumer.d.ts` })]),
    ...(target === "vue" ? [vue()] : target === "react" ? [react()] : target === "preact" ? [preact()] : target === "svelte" ? [svelte()] : []),
  ];
}
