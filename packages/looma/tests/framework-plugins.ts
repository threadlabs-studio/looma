import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Plugin } from "vite";
import { sdkAliases } from "./renderers/sdk-aliases.ts";
import { componentFacade } from "./renderers/components.mjs";

const target = process.env.LOOMA_TEST_TARGET ?? "vue";
export const rendererDependencies = target === "vue" ? ["vue", "vue/server-renderer"]
  : target === "react" ? ["react", "react/jsx-runtime", "react/jsx-dev-runtime", "react-dom/client", "react-dom/server"]
  : target === "preact" ? ["preact", "preact/compat", "preact/hooks", "preact/jsx-runtime", "preact-render-to-string"] : [];
const componentId = `\0looma-test-components:${target}`;
// Both Vite prebundles and Vitest's resolved-import cache must belong to this immutable output.
const cacheIdentity = createHash("sha256").update(process.env.LOOMA_PREPARED_LIBRARY ?? randomUUID()).digest("hex").slice(0, 16);
export const rendererCacheDirectory = (suffix = "") => fileURLToPath(new URL(`../node_modules/.vite/looma-${target}-${cacheIdentity}${suffix}/`, import.meta.url));

/** Fixture builds consume immutable suite output and never prepare the source library. */
export function rendererPlugins(options: { externalStyles?: boolean; cacheSuffix?: string } = {}): Plugin[] {
  const externalStyles = options.externalStyles;
  let manifest: { target: string; components: any[]; client: string; clientModule: string; server: string; nativeDefinitions?: string; nativePreparation?: string };
  const prepared = () => {
    if (!manifest) {
      const directory = process.env.LOOMA_PREPARED_LIBRARY;
      if (!directory) throw new Error("Looma's renderer library must be prepared by suite setup before building a fixture.");
      manifest = JSON.parse(readFileSync(path.join(directory, "manifest.json"), "utf8"));
      if (manifest.target !== target) throw new Error(`Prepared ${manifest.target} library cannot run ${target} scenarios.`);
    }
    return manifest;
  };
  return [{
    name: `looma-test-renderer:${target}`,
    enforce: "pre",
    config: () => ({ cacheDir: rendererCacheDirectory(options.cacheSuffix), resolve: { alias: sdkAliases() }, ...(target === "vue" ? { define: { __VUE_OPTIONS_API__: "true", __VUE_PROD_DEVTOOLS__: "false", __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false" } } : {}) }),
    resolveId(id, _importer, options) {
      if (id === "@looma-test/style") return fileURLToPath(new URL(`./renderers/jsx-style${options?.ssr ? "-server" : ""}.ts`, import.meta.url));
      if (id === "@looma-test/native-server") return options?.ssr ? fileURLToPath(new URL("./renderers/native-server.ts", import.meta.url)) : "\0looma-native-server-client";
      if (id === "@looma-test/native-data") return "\0looma-native-data";
      if (id === "@looma-test/components") return componentId;
      if (id === "@looma-test/implementations") return prepared()[options?.ssr ? "server" : externalStyles ? "clientModule" : "client"];
      if (id === "@looma-test/scene") return fileURLToPath(new URL("./renderers/scene.ts", import.meta.url));
      if (id === "@looma-test/renderer" && (target === "svelte" || target === "angular")) return "\0looma-compiled-renderer";
      if (id === "@looma-test/renderer") return fileURLToPath(new URL(`./renderers/${target}.ts`, import.meta.url));
    },
    load(id) {
      if (id === "\0looma-native-server-client") return 'export async function renderNativeScene() { throw new Error("Server rendering requires the server library."); }';
      if (id === "\0looma-native-data") return `export { default as definitions } from ${JSON.stringify(prepared().nativeDefinitions)}; export const preparation = ${JSON.stringify(pathToFileURL(prepared().nativePreparation!).href)};`;
      if (id === "\0looma-compiled-renderer") return 'export { mount, renderHTML, settle, rendererTarget } from "@looma-test/implementations";';
      if (id === componentId) return componentFacade(prepared().components, "@looma-test/implementations", target);
    },
  }];
}
