import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const facadeRoot = path.join(repoRoot, "packages/looma");

async function hashTree(directory) {
  const hash = createHash("sha256");

  async function visit(current, relative = "") {
    for (const entry of (await readdir(current, { withFileTypes: true })).toSorted((a, b) =>
      a.name.localeCompare(b.name))) {
      const entryRelative = path.join(relative, entry.name);
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath, entryRelative);
      } else {
        hash.update(entryRelative);
        hash.update(await readFile(entryPath));
      }
    }
  }

  for (const entry of ["dist", "loader", "layout", "editor", "vue"]) {
    await visit(path.join(directory, entry), entry);
  }
  for (const entry of [
    "tokens.css",
    "theme-light.css",
    "theme-dark.css",
    "theme-high-contrast.css",
    "layout.css",
    "styles.css",
    "editor.css",
    "LICENSE",
  ]) {
    hash.update(entry);
    hash.update(await readFile(path.join(directory, entry)));
  }
  return hash.digest("hex");
}

test("facade assembly is deterministic, self-contained, and boundary-safe", async () => {
  const buildCommand = [path.join(repoRoot, "tools/scripts/build-facade.mjs")];
  const assembleCommand = [...buildCommand, "--skip-workspace-build"];
  await Promise.all(
    ["core", "layout", "editor", "vue"].map((workspace) =>
      rm(path.join(repoRoot, "packages", workspace, "dist"), { recursive: true, force: true })
    )
  );
  await execFileAsync(process.execPath, buildCommand, { cwd: repoRoot });
  const firstHash = await hashTree(facadeRoot);
  await execFileAsync(process.execPath, assembleCommand, { cwd: repoRoot });
  const secondHash = await hashTree(facadeRoot);

  assert.equal(secondHash, firstHash);

  const [rootEsm, rootCjs, editor, extensions, vue] = await Promise.all([
    readFile(path.join(facadeRoot, "dist/index.js"), "utf8"),
    readFile(path.join(facadeRoot, "dist/index.cjs"), "utf8"),
    readFile(path.join(facadeRoot, "editor/index.js"), "utf8"),
    readFile(path.join(facadeRoot, "editor/extensions/index.js"), "utf8"),
    readFile(path.join(facadeRoot, "vue/index.js"), "utf8"),
  ]);

  assert.doesNotMatch(rootEsm + rootCjs, /(?:from|require\(|import\().*(?:vue|@tiptap\/)/);
  assert.doesNotMatch(editor, /(?:from|require\(|import\().*@tiptap\//);
  assert.match(extensions, /@tiptap\/extension-document/);
  assert.match(vue, /@threadlabs\/looma\/layout/);
  assert.match(vue, /@threadlabs\/looma\/core/);
  assert.match(vue, /@threadlabs\/looma\/editor/);
  assert.doesNotMatch(vue, /@threadlabs\/looma-(?:core|editor|layout)/);

  for (const relativePath of [
    "dist/index.d.ts",
    "loader/index.js",
    "loader/index.cjs.js",
    "loader/index.d.ts",
    "layout/index.js",
    "layout/index.cjs",
    "layout/index.d.ts",
    "editor/index.d.ts",
    "editor/extensions/index.d.ts",
    "vue/index.d.ts",
  ]) {
    assert.equal((await stat(path.join(facadeRoot, relativePath))).isFile(), true, relativePath);
  }
});
