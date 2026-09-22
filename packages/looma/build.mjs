// Builds the published package from src/.
//
// HTML Next assembles the components: the registration entry, component HTML, controller modules,
// plain DOM factories, and Vue single-file components. Vite and vue-tsc then compile the Vue
// components to JavaScript and declarations, the way any Vue library ships; the .vue files ship too.
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { assembleComponentPackage } from "@nextwebwg/declarative-components";
import vue from "@vitejs/plugin-vue";
import { build } from "vite";

const root = dirname(fileURLToPath(import.meta.url));
const assembled = join(root, ".build");
const outputs = ["dist", "vue", "vanilla", "components", "styles", "editor"];

await Promise.all([assembled, ...outputs.map((name) => join(root, name))].map((path) => rm(path, { recursive: true, force: true })));

const componentsRoot = join(root, "src/components");
const tags = (await readdir(componentsRoot)).filter((name) => name.startsWith("ui-")).sort();
const { components } = await assembleComponentPackage({
  name: "@threadlabs/looma",
  version: "0.0.0",
  outDirectory: assembled,
  components: tags.map((tag) => ({ source: join(componentsRoot, tag, `${tag}.html`) })),
});

// Everything but Vue ships as assembled; the component sources, controllers included, are shared by
// the DOM and Vue components.
for (const name of ["dist", "vanilla", "components", "styles"]) {
  await cp(join(assembled, name), join(root, name), { recursive: true }).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
}

// Vue: the entry names each component as Looma documents it (UiButton.vue exports as Button).
const vueSource = join(assembled, "vue");
const names = (await readdir(vueSource)).filter((file) => file.endsWith(".vue")).map((file) => file.slice(0, -4)).sort();
await writeFile(join(vueSource, "index.ts"), names.map((name) =>
  `export { default as ${name.replace(/^Ui(?=[A-Z])/, "")} } from "./${name}.vue";`).join("\n") + "\n");

// Vue, the editor's libraries, and the package's own entries resolve at the consumer.
// The components' controllers ship once, under components/, and the Vue components import them
// through the package's own export.
const componentsOut = join(assembled, "components");
const sharedControllers = {
  name: "looma-shared-controllers",
  enforce: "pre",
  resolveId(source, importer) {
    if (!importer || !source.startsWith(".")) return null;
    const path = resolve(dirname(importer.split("?")[0]), source);
    if (!path.startsWith(componentsOut)) return null;
    return { id: `@threadlabs/looma/components/${relative(componentsOut, path).split(sep).join("/")}`, external: true };
  },
};
const isDependency = (id) => id === "vue" || id === "lowlight" || id === "markdown-it" || id.startsWith("@threadlabs/looma/") ||
  id.startsWith("@tiptap/") || id.startsWith("lucide");
await build({
  configFile: false,
  logLevel: "warn",
  root: assembled,
  plugins: [sharedControllers, vue()],
  build: {
    outDir: join(root, "vue"),
    emptyOutDir: false,
    minify: false,
    // Scoped component styles are collected into one stylesheet: @threadlabs/looma/vue.css.
    lib: {
      entry: Object.fromEntries([
        ["index", join(vueSource, "index.ts")],
        ...names.map((name) => [name, join(vueSource, `${name}.vue`)]),
        ["editor/index", join(root, "src/vue/editor/index.ts")],
      ]),
      formats: ["es"],
      cssFileName: "components",
    },
    rollupOptions: {
      external: isDependency,
      output: { entryFileNames: "[name].js", chunkFileNames: "chunks/[name].js" },
    },
  },
});

await writeFile(join(assembled, "tsconfig.json"), JSON.stringify({
  compilerOptions: {
    target: "ES2022", module: "ESNext", moduleResolution: "Bundler", strict: true, skipLibCheck: true,
    lib: ["ES2022", "DOM", "DOM.Iterable"], allowJs: true, checkJs: false,
    declaration: true, emitDeclarationOnly: true, rootDir: ".", outDir: resolve(root, ".build/types"),
  },
  include: ["vue/*.vue", "vue/index.ts"],
}, null, 2));
execFileSync(join(root, "node_modules/.bin/vue-tsc"), ["-p", join(assembled, "tsconfig.json")], { stdio: "inherit" });
// Declarations describe the compiled modules (UiButton.js, UiButton.d.ts); the .vue sources ship
// beside them for reference and are not what TypeScript or bundlers resolve.
for (const name of names) {
  await cp(join(assembled, "types/vue", `${name}.vue.d.ts`), join(root, "vue", `${name}.d.ts`));
  await cp(join(vueSource, `${name}.vue`), join(root, "vue", `${name}.vue`));
}
const indexTypes = await readFile(join(assembled, "types/vue/index.d.ts"), "utf8");
await writeFile(join(root, "vue/index.d.ts"), indexTypes.replaceAll('.vue";', '.js";'));

// The editor's framework-neutral contracts and Tiptap extensions.
await build({
  configFile: false,
  logLevel: "warn",
  root,
  build: {
    outDir: join(root, "editor"),
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: {
        index: join(root, "src/editor/index.ts"),
        ui: join(root, "src/editor/ui.ts"),
        "extensions/index": join(root, "src/editor/extensions/index.ts"),
      },
      formats: ["es"],
    },
    rollupOptions: { external: isDependency, output: { entryFileNames: "[name].js", chunkFileNames: "chunks/[name].js" } },
  },
});
// Declarations for the hand-written TypeScript; @threadlabs/looma/vue resolves to the declarations
// built above.
execFileSync(join(root, "node_modules/.bin/vue-tsc"), ["-p", join(root, "tsconfig.json")], { stdio: "inherit" });
await cp(join(assembled, "types-src/editor"), join(root, "editor"), { recursive: true });
await cp(join(assembled, "types-src/vue/editor"), join(root, "vue/editor"), { recursive: true });

for (const file of await readdir(join(root, "src/tokens"))) {
  await cp(join(root, "src/tokens", file), join(root, file));
}
await mkdir(join(root, "dist"), { recursive: true });
console.log(`Built ${components.length} components.`);
