import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const facadeRoot = path.join(repoRoot, "packages/looma");
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
  for (const forbidden of ["vue", "@tiptap/core", "prosemirror-tables"]) {
    await assert.rejects(
      access(path.join(directory, "node_modules", forbidden)),
      `${forbidden} must not be installed for a core-only consumer`,
    );
  }
}

async function verifyPeerConsumer(directory, tarball, facadeManifest) {
  await mkdir(directory, { recursive: true });
  await writeJson(path.join(directory, "package.json"), {
    name: "looma-peer-consumer",
    private: true,
    type: "module",
    dependencies: {
      "@threadlabs/looma": `file:${tarball}`,
      ...facadeManifest.peerDependencies,
    },
  });
  await writeFile(
    path.join(directory, "index.mjs"),
    `import { TopBar } from "@threadlabs/looma/vue";\n` +
      `import { getDefaultEditorExtensions } from "@threadlabs/looma/editor/extensions";\n` +
      `if (!TopBar || typeof getDefaultEditorExtensions !== "function") process.exit(1);\n`,
  );
  await writeFile(
    path.join(directory, "index.ts"),
    `import { TopBar } from "@threadlabs/looma/vue";\n` +
      `import { getDefaultEditorExtensions } from "@threadlabs/looma/editor/extensions";\n` +
      `void TopBar;\nvoid getDefaultEditorExtensions;\n`,
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
    await verifyPeerConsumer(path.join(temporaryRoot, "peers"), tarball, facadeManifest);
    console.log("Packed Looma facade consumer matrix passed");
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
