import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const facadeRoot = path.join(repoRoot, "packages/looma");
const releaseConsumerRoot = path.join(repoRoot, "tests/release/consumer");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

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
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function installConsumer(directory) {
  await run(
    pnpm,
    ["install", "--ignore-scripts", "--config.auto-install-peers=false", "--prefer-offline"],
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
    dependencies: { "@threadlabs/looma": `file:${tarball}` },
  });
  await writeFile(
    path.join(directory, "index.mjs"),
    `import { openOverlay } from "@threadlabs/looma";\n` +
      `import { closeOverlay } from "@threadlabs/looma/core";\n` +
      `await import("@threadlabs/looma/loader");\n` +
      `await import("@threadlabs/looma/layout");\n` +
      `await import("@threadlabs/looma/editor/ui");\n` +
      `if (typeof openOverlay !== "function" || typeof closeOverlay !== "function") process.exit(1);\n` +
      `if (!import.meta.resolve("@threadlabs/looma/tokens.css").endsWith("tokens.css")) process.exit(1);\n`,
  );
  await writeFile(
    path.join(directory, "index.cjs"),
      `const root = require("@threadlabs/looma");\n` +
      `const core = require("@threadlabs/looma/core");\n` +
      `require("@threadlabs/looma/layout");\n` +
      `if (typeof root.openOverlay !== "function" || typeof core.closeOverlay !== "function") process.exit(1);\n`,
  );
  await writeFile(
    path.join(directory, "index.ts"),
    `import { openOverlay } from "@threadlabs/looma";\n` +
      `import { closeOverlay } from "@threadlabs/looma/core";\n` +
      `void openOverlay;\nvoid closeOverlay;\n`,
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
  await run(process.execPath, ["index.cjs"], directory);
  await run(
    pnpm,
    ["--filter", "@threadlabs/looma-core", "exec", "tsc", "-p", path.join(directory, "tsconfig.json")],
    repoRoot,
  );

  const installed = JSON.parse(
    await readFile(path.join(directory, "node_modules/@threadlabs/looma/package.json"), "utf8"),
  );
  assert.equal(installed.name, "@threadlabs/looma");
  await assertPackagesAbsent(
    directory,
    ["vue", "@tiptap/core", "prosemirror-tables"],
    "a core-only consumer",
  );
}

async function verifyVueOnlyConsumer(directory, tarball, facadeManifest) {
  await mkdir(directory, { recursive: true });
  await writeJson(path.join(directory, "package.json"), {
    name: "looma-vue-only-consumer",
    private: true,
    type: "module",
    dependencies: {
      "@threadlabs/looma": `file:${tarball}`,
      vue: facadeManifest.peerDependencies.vue,
    },
  });
  await writeFile(
    path.join(directory, "index.mjs"),
    `import { Button, TopBar } from "@threadlabs/looma/vue";\n` +
      `await import("@threadlabs/looma/editor/ui");\n` +
      `if (!Button || !TopBar) process.exit(1);\n`,
  );
  await writeFile(
    path.join(directory, "index.ts"),
    `import { Button, TopBar } from "@threadlabs/looma/vue";\n` +
      `import type { InsertTableEventDetail } from "@threadlabs/looma/editor/ui";\n` +
      `const detail: InsertTableEventDetail = { rows: 2, cols: 3, withHeaderRow: true };\n` +
      `void Button;\nvoid TopBar;\nvoid detail;\n`,
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
    ["--filter", "@threadlabs/looma-core", "exec", "tsc", "-p", path.join(directory, "tsconfig.json")],
    repoRoot,
  );
  await assertPackagesAbsent(
    directory,
    ["@tiptap/core", "@tiptap/pm", "prosemirror-tables"],
    "a Vue-only consumer",
  );
}

async function verifyPeerConsumer(directory, tarball, facadeManifest) {
  await mkdir(directory, { recursive: true });
  await writeJson(path.join(directory, "package.json"), {
    name: "looma-peer-consumer",
    private: true,
    type: "module",
    dependencies: {
      "@threadlabs/looma": `file:${tarball}`,
      "@tiptap/vue-3": "^2.11.5",
      ...facadeManifest.peerDependencies,
    },
  });
  await writeFile(
    path.join(directory, "index.mjs"),
    `import { EditorContent, useEditor } from "@tiptap/vue-3";\n` +
      `import { getDefaultEditorExtensions as getEditorExtensions } from "@threadlabs/looma/editor";\n` +
      `import { getDefaultEditorExtensions as getExtensionPreset } from "@threadlabs/looma/editor/extensions";\n` +
      `import { TopBar } from "@threadlabs/looma/vue";\n` +
      `import { EditorToolbar, getDefaultEditorExtensions } from "@threadlabs/looma/vue/editor";\n` +
      `const editorExtensions = getEditorExtensions();\n` +
      `const extensionPreset = getExtensionPreset();\n` +
      `if (typeof useEditor !== "function" || !EditorContent || !TopBar || !EditorToolbar) process.exit(1);\n` +
      `if (!Array.isArray(editorExtensions) || editorExtensions.length === 0) process.exit(1);\n` +
      `if (!Array.isArray(extensionPreset) || extensionPreset.length === 0) process.exit(1);\n` +
      `if (typeof getDefaultEditorExtensions !== "function") process.exit(1);\n`,
  );
  await writeFile(
    path.join(directory, "index.ts"),
    `import { EditorContent, useEditor } from "@tiptap/vue-3";\n` +
      `import { getDefaultEditorExtensions as getEditorExtensions } from "@threadlabs/looma/editor";\n` +
      `import { getDefaultEditorExtensions as getExtensionPreset } from "@threadlabs/looma/editor/extensions";\n` +
      `import { TopBar } from "@threadlabs/looma/vue";\n` +
      `import { EditorToolbar, getDefaultEditorExtensions } from "@threadlabs/looma/vue/editor";\n` +
      `void EditorContent;\nvoid useEditor;\nvoid getEditorExtensions;\nvoid getExtensionPreset;\nvoid TopBar;\n` +
      `void EditorToolbar;\nvoid getDefaultEditorExtensions;\n`,
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
    ["--filter", "@threadlabs/looma-core", "exec", "tsc", "-p", path.join(directory, "tsconfig.json")],
    repoRoot,
  );
}

async function verifyReleaseConsumer(directory, tarball) {
  const [fixtureManifest, tsconfig, source] = await Promise.all([
    readFile(path.join(releaseConsumerRoot, "package.json"), "utf8").then(JSON.parse),
    readFile(path.join(releaseConsumerRoot, "tsconfig.json"), "utf8").then(JSON.parse),
    readFile(path.join(releaseConsumerRoot, "src/index.ts"), "utf8"),
  ]);

  await mkdir(path.join(directory, "src"), { recursive: true });
  fixtureManifest.dependencies["@threadlabs/looma"] = `file:${tarball}`;
  fixtureManifest.pnpm.overrides["@threadlabs/looma"] = `file:${tarball}`;
  await writeJson(path.join(directory, "package.json"), fixtureManifest);
  await writeJson(path.join(directory, "tsconfig.json"), tsconfig);
  await writeFile(path.join(directory, "src/index.ts"), source);

  await installConsumer(directory);
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

    await verifyMinimalConsumer(path.join(temporaryRoot, "minimal"), tarball);
    await verifyVueOnlyConsumer(path.join(temporaryRoot, "vue-only"), tarball, facadeManifest);
    await verifyPeerConsumer(path.join(temporaryRoot, "peers"), tarball, facadeManifest);
    await verifyReleaseConsumer(path.join(temporaryRoot, "release"), tarball);
    console.log("Packed Looma facade consumer matrix passed");
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
