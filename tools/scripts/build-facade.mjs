import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { verifyFacade } from "./verify-facade.mjs";

const rewriteExtensions = new Set([".cjs", ".css", ".cts", ".js", ".mjs", ".ts"]);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function runWorkspaceBuilds(repoRoot) {
  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(
    pnpm,
    [
      "--filter", "@threadlabs/looma-core",
      "--filter", "@threadlabs/looma-layout",
      "--filter", "@threadlabs/looma-editor",
      "--filter", "@threadlabs/looma-vue",
      "run", "build",
    ],
    { cwd: repoRoot, stdio: "inherit" },
  );
  if (result.error) throw result.error;
  assert.equal(result.status, 0, "private Looma workspace builds failed");
}

async function rewriteTree(targetPath, rewrites) {
  const targetStat = await stat(targetPath);
  if (targetStat.isDirectory()) {
    for (const entry of await readdir(targetPath, { withFileTypes: true })) {
      await rewriteTree(path.join(targetPath, entry.name), rewrites);
    }
    return;
  }
  if (!rewriteExtensions.has(path.extname(targetPath))) return;

  const source = await readFile(targetPath, "utf8");
  const rewritten = rewrites.reduce(
    (value, { from, to }) => value.split(from).join(to),
    source,
  );
  if (rewritten !== source) await writeFile(targetPath, rewritten);
}

export async function assembleFacade({ repoRoot, skipWorkspaceBuild = false }) {
  const facadeRoot = path.join(repoRoot, "packages/looma");
  const assembly = await readJson(path.join(facadeRoot, "facade-assembly.json"));

  if (!skipWorkspaceBuild) runWorkspaceBuilds(repoRoot);

  const copiedTargets = [];
  for (const mapping of assembly.copies) {
    const source = path.resolve(repoRoot, mapping.source);
    const target = path.resolve(repoRoot, mapping.target);
    assert.ok(source.startsWith(`${repoRoot}${path.sep}`), `${mapping.source} escapes the repository`);
    assert.ok(target.startsWith(`${facadeRoot}${path.sep}`), `${mapping.target} escapes the facade`);
    await rm(target, { recursive: true, force: true });
    const sourceStat = await stat(source);
    await cp(source, target, { recursive: sourceStat.isDirectory(), force: true });
    copiedTargets.push(target);
  }

  for (const target of copiedTargets) await rewriteTree(target, assembly.rewrites);
  await verifyFacade({ repoRoot });
}

async function main() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  await assembleFacade({
    repoRoot,
    skipWorkspaceBuild: process.argv.includes("--skip-workspace-build"),
  });
  console.log("Looma facade assembled and verified");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
