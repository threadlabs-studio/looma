import "../sdk-loader.mjs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder } from "vite";
import { isBuiltin } from "node:module";
import { nativePreparation } from "./native-prepare.ts";
import { angularScene } from "./angular-prepare.ts";
import { componentFixtures, sourceCatalog } from "./components.mjs";
import { libraryPlugins, target } from "./library-plugins.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));

/** One immutable library for all test files, with native framework client and SSR compilation. */
export async function prepareLibrary() {
  const started = performance.now();
  await mkdir(path.join(root, ".test-build"), { recursive: true });
  const directory = await mkdtemp(path.join(root, ".test-build", `${target}-library-`));
  try {
    const catalog = await sourceCatalog();
    const components = await componentFixtures(target, catalog);
    const native = target === "html-next" ? await nativePreparation(directory, catalog.definitions, catalog.core) : undefined;
    const angular = target === "angular" ? await angularScene(directory, components) : undefined;
    const entry = path.join(directory, "library.js");
    await writeFile(entry, `export const rendererTarget = ${JSON.stringify(target)};\n${["react", "preact", "svelte"].includes(target) ? 'export { renderPrepared } from "@threadlabs/looma";\n' : ""}export { ${components.map(component => target === "html-next" ? `create${component.name} as ${component.name}` : component.name).join(", ")} } from "@threadlabs/looma";\n` + (target === "svelte" ? `export { mount, renderHTML, settle } from ${JSON.stringify(fileURLToPath(new URL("./svelte.svelte.ts", import.meta.url)))};\n` : angular ? `export { mount, renderHTML, settle } from ${JSON.stringify(angular.entry)};\n` : ""));
    const externalDependency = (id: string) => !id.startsWith(".") && !id.startsWith("/") && !id.startsWith("\0") && id !== "@threadlabs/looma" && !id.startsWith("@looma-test/") && !id.startsWith("html-next:") && !id.startsWith("virtual:html-next/") && !(target === "angular" && id.startsWith("@angular/"));
    const sharedRuntime = (id: string) => /^(?:vue|@vue\/[^/]+|react|react-dom|preact|svelte)(?:\/|$)/.test(id) || id.startsWith("@nextwebwg/html-next") || id.startsWith("@tiptap/") || id.startsWith("prosemirror-");
    const output = (environment: string) => ({
      outDir: path.join(directory, environment),
      minify: false as const,
      modulePreload: false as const,
      // Reusable library output keeps native CSS for the final consumer build.
      cssMinify: false as const,
      lib: { entry: native && environment === "server" ? { library: entry, preparation: native.file } : entry, formats: ["es" as const], cssFileName: "components", fileName: () => "index.js" },
      rolldownOptions: {
        external: (id: string) => externalDependency(id) && environment === "server" && isBuiltin(id),
        output: { preserveModules: true, entryFileNames: "[name].js" },
      },
    });
    const resolvedDependencies = new Set<string>();
    const builder = await createBuilder({
      configFile: false,
      logLevel: "warn",
      root: directory,
      plugins: [{
        name: "looma-library-dependencies",
        enforce: "pre",
        async resolveId(id, importer) {
          if (!importer || !externalDependency(id)) return;
          if (isBuiltin(id)) return this.environment.config.consumer === "server" ? { id, external: true } : undefined;
          // Resolve while the original importer still supplies its pnpm dependency context.
          // The reusable output can then live in another directory without losing that context.
          const resolved = await this.resolve(id, importer, { skipSelf: true });
          if (!resolved) throw new Error(`Cannot resolve reusable library dependency ${id} from ${importer}.`);
          // Freeze ordinary dependencies with the library. Their browser maps are resolved
          // by this build; fixtures share framework, editor peer runtimes and candidate SDK exports.
          if (!sharedRuntime(id)) return resolved;
          const consumer = await this.resolve(id, path.join(root, "package.json"), { skipSelf: true });
          const external = consumer?.id === resolved.id ? id : resolved.id;
          if (/\.[cm]?[jt]sx?$/.test(resolved.id)) resolvedDependencies.add(external);
          return { ...resolved, id: external, external: true };
        },
      }, ...libraryPlugins()],
      build: output("client"),
      // One config hook invocation prepares and typechecks the source graph for both environments.
      builder: { sharedConfigBuild: true, sharedPlugins: true },
      define: { "process.env.NODE_ENV": "process.env.NODE_ENV" },
      oxc: { jsx: { development: false } },
      environments: {
        client: { build: output("client") },
        ssr: { consumer: "server", build: { ...output("server"), ssr: true } },
      },
    });
    await angular?.compile();
    const entries: Record<string, string> = {};
    let nativePrepareFile: string | undefined;
    let clientDependencies: string[] = [];
    let clientModule = "";
    let clientStyles: string[] = [];
    for (const [name, environment] of Object.entries(builder.environments)) {
      const result = await builder.build(environment);
      if (name === "client") clientDependencies = [...resolvedDependencies].sort();
      const output = (Array.isArray(result) ? result[0] : result) as { output: { type: string; isEntry?: boolean; facadeModuleId?: string; fileName: string }[] };
      const main = output.output.find(chunk => chunk.type === "chunk" && chunk.isEntry && chunk.facadeModuleId === entry);
      if (!main) throw new Error(`Missing ${name} library entry.`);
      const folder = name === "client" ? "client" : "server";
      if (native && name === "ssr") { const preparation = output.output.find(chunk => chunk.type === "chunk" && chunk.isEntry && chunk.facadeModuleId === native.file); if (!preparation) throw new Error("Missing native producer module."); nativePrepareFile = path.join(directory, folder, preparation.fileName); }
      const css = output.output.filter(chunk => chunk.type === "asset" && chunk.fileName.endsWith(".css"));
      if (name === "client") { clientModule = path.join(directory, folder, main.fileName); clientStyles = css.map(asset => path.join(directory, folder, asset.fileName)); }
      const index = path.join(directory, folder, "entry.js");
      await writeFile(index, (name === "client" ? css.map(asset => `import ${JSON.stringify("./" + asset.fileName)};`).join("\n") : "") + `\nexport * from ${JSON.stringify("./" + main.fileName)};\n`);
      entries[name] = index;
    }
    const fixtureStyles = path.join(directory, "components.css");
    await writeFile(fixtureStyles, (await Promise.all(clientStyles.map(file => readFile(file, "utf8")))).join("\n"));
    const manifest = {
      target, components, clientDependencies, clientModule, clientStyles, fixtureStyles,
      client: entries.client,
      server: entries.ssr,
      ...(native ? { nativeDefinitions: native.definitionsFile, nativePreparation: nativePrepareFile } : {}),
    };
    await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
    console.log(`Prepared ${components.length} Looma components for ${target} once (${((performance.now() - started) / 1000).toFixed(2)}s).`);
    return directory;
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

export default async function setup() {
  if (process.env.LOOMA_PREPARED_LIBRARY) {
    if (process.env.LOOMA_PREPARED_LIBRARY_OWNER !== process.env.LOOMA_PREPARED_LIBRARY) return;
    const directory = process.env.LOOMA_PREPARED_LIBRARY;
    return async () => { delete process.env.LOOMA_PREPARED_LIBRARY; delete process.env.LOOMA_PREPARED_LIBRARY_OWNER; await rm(directory, { recursive: true, force: true }); };
  }
  const directory = await prepareLibrary();
  process.env.LOOMA_PREPARED_LIBRARY = directory;
  return async () => {
    delete process.env.LOOMA_PREPARED_LIBRARY;
    await rm(directory, { recursive: true, force: true });
  };
}
