import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const facadeDirectory = path.join(repoRoot, "packages/looma");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(repoRoot, relativePath), "utf8"));
}

test("the facade is the only publishable Looma workspace", async () => {
  const packageDirectories = await readdir(path.join(repoRoot, "packages"), {
    withFileTypes: true,
  });
  const manifests = await Promise.all(
    packageDirectories
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => ({
        directory: entry.name,
        manifest: await readJson(`packages/${entry.name}/package.json`),
      })),
  );
  const publishable = manifests.filter(({ manifest }) => manifest.private !== true);

  assert.deepEqual(
    publishable.map(({ manifest }) => manifest.name),
    ["@threadlabs/looma"],
  );
  for (const { directory, manifest } of manifests) {
    if (directory === "looma") continue;
    assert.equal(manifest.private, true, `${manifest.name} must remain private`);
    assert.equal(manifest.publishConfig, undefined, `${manifest.name} must not carry publishConfig`);
  }
});

test("the facade declares the exact public subpath and peer contract", async () => {
  const manifest = await readJson("packages/looma/package.json");
  const expectedExports = [
    ".",
    "./core",
    "./loader",
    "./layout",
    "./editor",
    "./editor/extensions",
    "./vue",
    "./tokens.css",
    "./theme-light.css",
    "./theme-dark.css",
    "./theme-high-contrast.css",
    "./layout.css",
    "./styles.css",
    "./editor.css",
  ];

  assert.deepEqual(Object.keys(manifest.exports), expectedExports);
  assert.deepEqual(manifest.exports["."], manifest.exports["./core"]);
  assert.equal(manifest.exports["."].import, "./dist/index.js");
  assert.equal(manifest.exports["."].require, "./dist/index.cjs");
  assert.equal(manifest.exports["./editor"].import, "./editor/index.js");
  assert.equal(manifest.exports["./editor/extensions"].import, "./editor/extensions/index.js");
  assert.equal(manifest.exports["./vue"].import, "./vue/index.js");
  assert.equal(manifest.peerDependenciesMeta.vue.optional, true);
  assert.equal(manifest.peerDependenciesMeta["@tiptap/core"].optional, true);
  assert.equal(manifest.peerDependenciesMeta["@tiptap/pm"].optional, true);
  assert.equal(manifest.peerDependenciesMeta["prosemirror-tables"].optional, true);
  assert.equal(manifest.dependencies, undefined);
  assert.ok(manifest.sideEffects.includes("./vue/index.js"));
  assert.ok(manifest.sideEffects.includes("./*.css"));
  assert.equal(manifest.publishConfig.access, "public");
  assert.equal(manifest.publishConfig.provenance, true);
});

test("the assembly mapping covers every explicit facade export", async () => {
  const [manifest, assembly] = await Promise.all([
    readJson("packages/looma/package.json"),
    readJson("packages/looma/facade-assembly.json"),
  ]);

  assert.equal(assembly.schemaVersion, 1);
  assert.equal(assembly.package, "@threadlabs/looma");
  assert.deepEqual(assembly.exports, Object.keys(manifest.exports));
  assert.ok(
    assembly.rewrites.some(
      ({ from, to }) => from === "@threadlabs/looma-core" && to === "@threadlabs/looma/core",
    ),
  );
  assert.ok(
    assembly.rewrites.some(
      ({ from, to }) => from === "@threadlabs/looma-editor" && to === "@threadlabs/looma/editor",
    ),
  );
  assert.ok(
    assembly.rewrites.some(
      ({ from, to }) => from === "@threadlabs/looma-layout" && to === "@threadlabs/looma/layout",
    ),
  );
  assert.equal(path.basename(facadeDirectory), "looma");
});
