import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { verifyDocumentationConsumer } from "./verify-docs-consumer.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const facadeRoot = path.join(repoRoot, "packages/looma");
const releaseConsumerRoot = path.join(repoRoot, "tests/release/consumer");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const packageManager = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8")).packageManager;

async function run(command, args, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code ?? signal}`));
    });
  });
}

async function writeJson(filePath, value) {
  const content = path.basename(filePath) === "package.json" ? { ...value, packageManager } : value;
  await writeFile(filePath, `${JSON.stringify(content, null, 2)}\n`);
}

async function installConsumer(directory, { strictPeers = false } = {}) {
  await run(
    pnpm,
    ["install", "--ignore-scripts", ...(strictPeers ? ["--strict-peer-dependencies"] : []), "--config.auto-install-peers=false", "--prefer-offline", `--config.cache-dir=${path.join(path.dirname(directory), "registry-metadata")}`],
    directory,
  );
}

async function assertPackagesAbsent(directory, packages, consumerLabel) {
  for (const packageName of packages) {
    await assert.rejects(
      access(path.join(directory, "node_modules", packageName)),
      `${packageName} must not be installed for ${consumerLabel}`,
    );
  }
}

async function verifyMinimalConsumer(directory, tarball) {
  await mkdir(directory, { recursive: true });
  await writeJson(path.join(directory, "package.json"), {
    name: "looma-minimal-consumer",
    private: true,
    type: "module",
    dependencies: {
      "@threadlabs/looma": `file:${tarball}`,
    },
  });
  // Without a document (SSR), the registration entry loads and registers nothing.
  await writeFile(
    path.join(directory, "index.mjs"),
    `const { definitions, register, stop } = await import("@threadlabs/looma");\n` +
      `if (typeof (await import("@threadlabs/looma/input-modality")).trackInputModality !== "function") process.exit(1);\n` +
      `if (!Array.isArray(definitions) || definitions.length === 0 || typeof register !== "function" || stop !== undefined) process.exit(1);\n` +
      `if (!import.meta.resolve("@threadlabs/looma/tokens.css").endsWith("tokens.css")) process.exit(1);\n` +
      `if (!import.meta.resolve("@threadlabs/looma/components/ui-button/ui-button.html").endsWith("ui-button.html")) process.exit(1);\n` +
      `for (const entry of ["vue", "vue.css", "vue/editor", "vue/editor/compact", "vue/UiButton.js"]) {\n` +
      `  try { import.meta.resolve("@threadlabs/looma/" + entry); throw new Error("Legacy Vue export remains: " + entry); }\n` +
      `  catch (error) { if (error.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED") throw error; }\n}\n`,
  );
  await writeFile(
    path.join(directory, "index.ts"),
    `import { definitions, register } from "@threadlabs/looma";\n` +
      `import { trackInputModality } from "@threadlabs/looma/input-modality";\n` +
      `void definitions;\nvoid register;\nvoid trackInputModality;\n`,
  );
  await writeJson(path.join(directory, "tsconfig.json"), {
    compilerOptions: {
      lib: ["ES2022", "DOM"],
      module: "ESNext",
      moduleResolution: "Bundler",
      noEmit: true,
      strict: true,
      target: "ES2022",
    },
    include: ["index.ts"],
  });

  await installConsumer(directory);
  await run(process.execPath, ["index.mjs"], directory);
  await run(
    pnpm,
    ["--filter", "@threadlabs/looma", "exec", "tsc", "-p", path.join(directory, "tsconfig.json")],
    repoRoot,
  );

  const installed = JSON.parse(
    await readFile(path.join(directory, "node_modules/@threadlabs/looma/package.json"), "utf8"),
  );
  assert.equal(installed.name, "@threadlabs/looma");
  await assertPackagesAbsent(
    directory,
    ["vue", "valibot", "@tiptap/core", "prosemirror-tables", "markupress", "@threadlabs/markupkit", "vite"],
    "a core-only consumer",
  );
}

async function verifyVueOnlyConsumer(directory, tarball, facadeManifest) {
  await mkdir(directory, { recursive: true });
  const releaseManifest = JSON.parse(await readFile(path.join(releaseConsumerRoot, "package.json"), "utf8"));
  await writeJson(path.join(directory, "package.json"), {
    name: "looma-vue-only-consumer", private: true, type: "module",
    dependencies: {
      "@threadlabs/looma": `file:${tarball}`,
      vue: facadeManifest.devDependencies.vue,
      "@vue/server-renderer": facadeManifest.devDependencies.vue,
    },
    devDependencies: {
      "@nextwebwg/html-next-unplugin": facadeManifest.devDependencies["@nextwebwg/html-next-unplugin"],
      "@vitejs/plugin-vue": facadeManifest.devDependencies["@vitejs/plugin-vue"],
      "@types/node": releaseManifest.devDependencies["@types/node"],
      typescript: facadeManifest.devDependencies.typescript,
      "vue-tsc": facadeManifest.devDependencies["vue-tsc"],
      vite: facadeManifest.devDependencies.vite,
    },
  });
  await writeFile(path.join(directory, "index.ts"),
    `import { UiButton, UiTopBar } from "@threadlabs/looma";
` +
    `import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
` +
    `const html = await renderToString(createSSRApp({ render: () => h(UiTopBar, { title: "Writing" }, { actions: () => h(UiButton, null, () => "Save") }) }));
` +
    `if (!html.includes("Save") || html.includes("<ui-button")) throw new Error(html);
`);
  await writeFile(path.join(directory, "vite.config.mjs"),
    `import htmlNext from "@nextwebwg/html-next-unplugin/vite";
import vue from "@vitejs/plugin-vue";
` +
    `export default { plugins: [htmlNext({ target: "vue" }), vue()], build: { ssr: "index.ts", rollupOptions: { output: { entryFileNames: "index.js" } } } };
`);
  await writeFile(path.join(directory, "client.ts"),
    `import { UiButton, UiTopBar } from "@threadlabs/looma";
import { createApp, h } from "vue";
` +
    `createApp({ render: () => h(UiTopBar, { title: "Writing" }, { actions: () => h(UiButton, null, () => "Save") }) }).mount("#app");
`);
  await writeFile(path.join(directory, "vite.client.config.mjs"),
    `import config from "./vite.config.mjs";
` +
    `export default { ...config, build: { outDir: "dist-client", lib: { entry: "client.ts", formats: ["es"] } } };
`);
  await writeJson(path.join(directory, "tsconfig.json"), {
    compilerOptions: { lib: ["ES2022", "DOM", "DOM.Iterable"], module: "ESNext", moduleResolution: "Bundler", noEmit: true, strict: true, target: "ES2022" },
    include: ["index.ts", "client.ts", "src/html-next.d.ts"],
  });
  await installConsumer(directory, { strictPeers: true });
  await run(pnpm, ["exec", "vite", "build"], directory);
  await run(process.execPath, ["dist/index.js"], directory);
  await run(pnpm, ["exec", "vite", "build", "--config", "vite.client.config.mjs"], directory);
  await run(pnpm, ["exec", "vue-tsc", "-p", "tsconfig.json"], directory);
  await assertPackagesAbsent(directory, ["valibot", "@tiptap/core", "@tiptap/pm", "prosemirror-tables"], "a Vue-only consumer");
}

async function verifyPeerConsumer(directory, tarball, facadeManifest) {
  await mkdir(directory, { recursive: true });
  await writeJson(path.join(directory, "package.json"), {
    name: "looma-peer-consumer", private: true, type: "module",
    dependencies: {
      "@threadlabs/looma": `file:${tarball}`,
      "@tiptap/core": facadeManifest.peerDependencies["@tiptap/core"],
      "@tiptap/pm": facadeManifest.peerDependencies["@tiptap/pm"],
    },
  });
  const source = `import { getDefaultEditorExtensions } from "@threadlabs/looma/editor";
` +
    `import { getDefaultEditorExtensions as preset } from "@threadlabs/looma/editor/extensions";
` +
    `import { getCompactEditorExtensions } from "@threadlabs/looma/editor/compact";
` +
    `import { measureTableOverlayGeometry } from "@threadlabs/looma/editor/ui";
` +
    `if (!getDefaultEditorExtensions().length || !preset().length || !getCompactEditorExtensions().length || typeof measureTableOverlayGeometry !== "function") throw new Error("editor exports missing");
`;
  await writeFile(path.join(directory, "index.mjs"), source);
  await writeFile(path.join(directory, "index.ts"), source);
  await writeJson(path.join(directory, "tsconfig.json"), {
    compilerOptions: { lib: ["ES2022", "DOM", "DOM.Iterable"], module: "ESNext", moduleResolution: "Bundler", noEmit: true, strict: true, target: "ES2022" },
    include: ["index.ts"],
  });
  await installConsumer(directory);
  await run(process.execPath, ["index.mjs"], directory);
  await run(pnpm, ["--filter", "@threadlabs/looma", "exec", "tsc", "-p", path.join(directory, "tsconfig.json")], repoRoot);
  await assertPackagesAbsent(directory, ["vue", "@tiptap/vue-3"], "a headless editor consumer");
}

async function verifyReleaseConsumer(directory, tarball) {
  const [fixtureManifest, tsconfig, source, viteConfig] = await Promise.all([
    readFile(path.join(releaseConsumerRoot, "package.json"), "utf8").then(JSON.parse),
    readFile(path.join(releaseConsumerRoot, "tsconfig.json"), "utf8").then(JSON.parse),
    readFile(path.join(releaseConsumerRoot, "src/index.ts"), "utf8"),
    readFile(path.join(releaseConsumerRoot, "vite.config.mjs"), "utf8"),
  ]);

  await mkdir(path.join(directory, "src"), { recursive: true });
  fixtureManifest.dependencies["@threadlabs/looma"] = `file:${tarball}`;
  fixtureManifest.pnpm.overrides["@threadlabs/looma"] = `file:${tarball}`;
  await writeJson(path.join(directory, "package.json"), fixtureManifest);
  await writeJson(path.join(directory, "tsconfig.json"), tsconfig);
  await writeFile(path.join(directory, "src/index.ts"), source);
  await writeFile(path.join(directory, "vite.config.mjs"), viteConfig);

  await installConsumer(directory);
  await run(pnpm, ["run", "build"], directory);
  await run(pnpm, ["run", "typecheck"], directory);
  await run(pnpm, ["run", "verify:ssr"], directory);
}

async function main() {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "looma-facade-consumer-"));
  try {
    const packDirectory = path.join(temporaryRoot, "pack");
    await mkdir(packDirectory);
    await run(pnpm, ["--dir", facadeRoot, "pack", "--pack-destination", packDirectory], repoRoot);
    const tarballs = (await readdir(packDirectory)).filter((entry) => entry.endsWith(".tgz"));
    assert.deepEqual(tarballs.length, 1);
    const tarball = path.join(packDirectory, tarballs[0]);
    const facadeManifest = JSON.parse(await readFile(path.join(facadeRoot, "package.json"), "utf8"));

    // The installed docs build and the smaller SSR/type consumers use separate directories.
    // Drain both branches before cleanup, including when one reports a failure.
    const consumers = await Promise.allSettled([
      (async () => {
        await verifyMinimalConsumer(path.join(temporaryRoot, "minimal"), tarball);
        await verifyVueOnlyConsumer(path.join(temporaryRoot, "vue-only"), tarball, facadeManifest);
        await verifyPeerConsumer(path.join(temporaryRoot, "peers"), tarball, facadeManifest);
        await verifyReleaseConsumer(path.join(temporaryRoot, "release"), tarball);
      })(),
      verifyDocumentationConsumer(path.join(temporaryRoot, "documentation"), tarball, facadeManifest),
    ]);
    const failed = consumers.find(consumer => consumer.status === "rejected");
    if (failed) throw failed.reason;
    console.log("Packed Looma facade consumer matrix passed");
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
