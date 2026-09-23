import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { applyVersion, isGreater, nextPatch, resolveNextVersion, VERSIONED_MANIFESTS } from "./release-version.mjs";

test("a changed package releases the next patch without anyone bumping it", () => {
  assert.deepEqual(
    resolveNextVersion({ publishedVersion: "0.6.3", declaredVersion: "0.6.3", packageChanged: true }),
    { release: true, version: "0.6.4", reason: "package changed since the last release" }
  );
});

test("an unchanged package releases nothing", () => {
  const resolution = resolveNextVersion({
    publishedVersion: "0.6.3",
    declaredVersion: "0.6.3",
    packageChanged: false
  });
  assert.equal(resolution.release, false);
});

test("a declared version that is ahead wins, which is how a minor or major lands", () => {
  assert.deepEqual(
    resolveNextVersion({ publishedVersion: "0.6.3", declaredVersion: "0.7.0", packageChanged: false }),
    { release: true, version: "0.7.0", reason: "declared version is ahead" }
  );
});

test("a declared version behind the registry never republishes over it", () => {
  const resolution = resolveNextVersion({
    publishedVersion: "0.6.3",
    declaredVersion: "0.5.9",
    packageChanged: true
  });
  assert.equal(resolution.version, "0.6.4");
});

test("version comparison orders every component numerically", () => {
  assert.equal(isGreater("0.10.0", "0.9.9"), true);
  assert.equal(isGreater("1.0.0", "0.99.99"), true);
  assert.equal(isGreater("0.6.3", "0.6.3"), false);
  assert.equal(nextPatch("0.9.9"), "0.9.10");
});

test("applying a version writes every manifest and the release config", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "looma-version-"));
  for (const manifest of VERSIONED_MANIFESTS) {
    await mkdir(path.join(root, path.dirname(manifest)), { recursive: true });
    await writeFile(path.join(root, manifest), `{\n  "name": "x",\n  "version": "0.6.3"\n}\n`, "utf8");
  }
  await mkdir(path.join(root, "tools/scripts"), { recursive: true });
  await writeFile(
    path.join(root, "tools/scripts/release-config.mjs"),
    'export const RELEASE_VERSION = "0.6.3";\n',
    "utf8"
  );

  const written = await applyVersion("0.6.4", { root });

  assert.equal(written.length, VERSIONED_MANIFESTS.length + 1);
  for (const manifest of VERSIONED_MANIFESTS) {
    assert.match(await readFile(path.join(root, manifest), "utf8"), /"version": "0\.6\.4"/);
  }
  assert.match(
    await readFile(path.join(root, "tools/scripts/release-config.mjs"), "utf8"),
    /RELEASE_VERSION = "0\.6\.4"/
  );
});

test("the repository's manifests are the ones the release applies to", async () => {
  const root = new URL("../../", import.meta.url);
  for (const manifest of VERSIONED_MANIFESTS) {
    const source = await readFile(new URL(manifest, root), "utf8");
    assert.match(source, /"version":\s*"\d+\.\d+\.\d+"/, manifest);
  }
});
