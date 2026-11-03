import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { rendererDependencies, rendererPlugins } from "../framework-plugins.ts";

/** Transform fixture entries on demand; library and dependency transforms are shared by every page. */
export async function startFixtureServers() {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const prepared = JSON.parse(await readFile(path.join(process.env.LOOMA_PREPARED_LIBRARY!, "manifest.json"), "utf8"));
  const servers = [];
  const addresses: Record<string, string> = {};
  try {
    for (const mode of ["production", "development"]) {
      const server = await createServer({
        configFile: false, logLevel: "warn", root, mode,
        plugins: rendererPlugins({ externalStyles: true, cacheSuffix: `-fixtures-${mode}` }),
        resolve: { alias: { "@looma-test/runtime": path.join(root, "dist/index.js") } },
        define: { "process.env.NODE_ENV": JSON.stringify(mode), __LOOMA_EDITOR_TARGET__: JSON.stringify(process.env.LOOMA_EDITOR_TARGET ?? "converted") },
        optimizeDeps: { entries: [], noDiscovery: true, rolldownOptions: { transform: { define: { "process.env.NODE_ENV": JSON.stringify(mode) } } }, include: [...rendererDependencies, prepared.clientModule, ...prepared.clientDependencies, "@nextwebwg/html-next/runtime", "@nextwebwg/html-next/live", "@nextwebwg/html-next/generated-runtime", "@nextwebwg/html-next/bindings", "@looma-test/runtime", "expressmark", "postcss", "@tiptap/core", "@threadlabs/looma/editor", "@threadlabs/looma/editor/extensions"] },
        server: { host: "127.0.0.1", port: 0, forwardConsole: false, hmr: false, watch: null, cors: { origin: ["null", "http://looma.test"] }, fs: { allow: [path.resolve(root, "../.."), ...(process.env.LOOMA_HTMLNEXT_ROOT ? [process.env.LOOMA_HTMLNEXT_ROOT] : [])] } },
      });
      servers.push(server);
      await server.listen();
      const address = server.httpServer!.address();
      if (!address || typeof address === "string") throw new Error("Missing fixture server address.");
      addresses[mode] = `http://127.0.0.1:${address.port}`;
    }
    process.env.LOOMA_FIXTURE_SERVERS = JSON.stringify(addresses);
    return async () => { delete process.env.LOOMA_FIXTURE_SERVERS; await Promise.all(servers.map(server => server.close())); };
  } catch (error) { await Promise.all(servers.map(server => server.close())); throw error; }
}
