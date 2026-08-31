import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const privatePublicSpecifier = /@threadlabs\/looma-(?:core|editor|layout|react|svelte|tokens|vue)/;
const runtimeExtensions = new Set([".cjs", ".css", ".cts", ".js", ".mjs", ".ts"]);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function exportTargets(value, condition = null) {
  if (typeof value === "string") return [{ condition, target: value }];
  return Object.entries(value).flatMap(([nextCondition, nextValue]) =>
    exportTargets(nextValue, nextCondition));
}

async function runtimeFiles(root, entry) {
  const result = [];
  const entryPath = path.join(root, entry);
  const entryStat = await stat(entryPath);
  if (entryStat.isFile()) return [entryPath];

  async function visit(directory) {
    for (const child of await readdir(directory, { withFileTypes: true })) {
      const childPath = path.join(directory, child.name);
      if (child.isDirectory()) {
        await visit(childPath);
      } else if (runtimeExtensions.has(path.extname(child.name))) {
        result.push(childPath);
      }
    }
  }
  await visit(entryPath);
  return result;
}

export async function verifyFacade({ repoRoot, typesOnly = false }) {
  const facadeRoot = path.join(repoRoot, "packages/looma");
  const [manifest, assembly] = await Promise.all([
    readJson(path.join(facadeRoot, "package.json")),
    readJson(path.join(facadeRoot, "facade-assembly.json")),
  ]);

  assert.equal(manifest.name, assembly.package);
  assert.deepEqual(Object.keys(manifest.exports), assembly.exports);

  for (const [exportName, definition] of Object.entries(manifest.exports)) {
    for (const { condition, target } of exportTargets(definition)) {
      if (typesOnly && condition !== "types") continue;
      const targetPath = path.resolve(facadeRoot, target);
      assert.ok(targetPath.startsWith(`${facadeRoot}${path.sep}`), `${exportName} escapes the facade`);
      assert.equal((await stat(targetPath)).isFile(), true, `${exportName} target ${target} is missing`);
    }
  }

  if (typesOnly) return;

  const files = (await Promise.all(
    ["dist", "loader", "layout", "editor", "vue"].map((entry) => runtimeFiles(facadeRoot, entry)),
  )).flat();
  for (const css of [
    "tokens.css",
    "theme-light.css",
    "theme-dark.css",
    "theme-high-contrast.css",
    "layout.css",
    "styles.css",
    "editor.css",
  ]) {
    files.push(path.join(facadeRoot, css));
  }

  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(
      source,
      privatePublicSpecifier,
      `${path.relative(facadeRoot, file)} retains a private Looma package specifier`,
    );
  }

  const [rootEsm, rootCjs, editorBase] = await Promise.all([
    readFile(path.join(facadeRoot, "dist/index.js"), "utf8"),
    readFile(path.join(facadeRoot, "dist/index.cjs"), "utf8"),
    readFile(path.join(facadeRoot, "editor/index.js"), "utf8"),
  ]);
  assert.doesNotMatch(rootEsm + rootCjs, /(?:from|require\(|import\().*(?:vue|@tiptap\/)/);
  assert.doesNotMatch(editorBase, /(?:from|require\(|import\().*@tiptap\//);
}

async function main() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  await verifyFacade({ repoRoot, typesOnly: process.argv.includes("--types-only") });
  console.log("Looma facade verification passed");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
