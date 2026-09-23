import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createReleaseCommit } from "./release-commit.mjs";
import { VERSIONED_MANIFESTS } from "./release-version.mjs";

const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

async function sourceRepository(version) {
  const root = await mkdtemp(path.join(tmpdir(), "looma-release-source-"));
  for (const manifest of VERSIONED_MANIFESTS) {
    await mkdir(path.dirname(path.join(root, manifest)), { recursive: true });
    await writeFile(path.join(root, manifest), `{\n  "name": "x",\n  "version": "${version}"\n}\n`);
  }
  await mkdir(path.join(root, "tools/scripts"), { recursive: true });
  await writeFile(path.join(root, "tools/scripts/release-config.mjs"), `export const RELEASE_VERSION = "${version}";\n`);
  git(root, "init", "-q");
  git(root, "-c", "user.name=someone", "-c", "user.email=someone@example.com", "-c", "commit.gpgsign=false", "add", ".");
  git(root, "-c", "user.name=someone", "-c", "user.email=someone@example.com", "-c", "commit.gpgsign=false", "commit", "-qm", "source");
  return root;
}

async function cloneOf(source) {
  const root = await mkdtemp(path.join(tmpdir(), "looma-release-runner-"));
  git(tmpdir(), "clone", "-q", source, root);
  return root;
}

test("every job rebuilds the same release commit from the same source", async () => {
  const source = await sourceRepository("0.7.2");
  const [prepare, publish] = [await cloneOf(source), await cloneOf(source)];
  try {
    const packed = await createReleaseCommit("0.7.3", { root: prepare });
    // A later second on the clock must not change the hash: the dates come from the source.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const published = await createReleaseCommit("0.7.3", { root: publish, expected: packed });

    assert.equal(published, packed);
    assert.notEqual(packed, git(source, "rev-parse", "HEAD"));
    assert.equal(git(prepare, "rev-parse", "HEAD~1"), git(source, "rev-parse", "HEAD"));
    assert.match(await readFile(path.join(publish, "tools/scripts/release-config.mjs"), "utf8"), /"0\.7\.3"/);
    assert.equal(git(publish, "status", "--porcelain"), "");
  } finally {
    await Promise.all([source, prepare, publish].map((dir) => rm(dir, { recursive: true, force: true })));
  }
});

test("a version the source already declares releases the source commit itself", async () => {
  const source = await sourceRepository("0.8.0");
  const runner = await cloneOf(source);
  try {
    assert.equal(await createReleaseCommit("0.8.0", { root: runner }), git(source, "rev-parse", "HEAD"));
  } finally {
    await Promise.all([source, runner].map((dir) => rm(dir, { recursive: true, force: true })));
  }
});

test("refuses to release a commit other than the one that was packed", async () => {
  const source = await sourceRepository("0.7.2");
  const runner = await cloneOf(source);
  try {
    await assert.rejects(
      createReleaseCommit("0.7.3", { root: runner, expected: "0".repeat(40) }),
      /does not match the packed release/
    );
  } finally {
    await Promise.all([source, runner].map((dir) => rm(dir, { recursive: true, force: true })));
  }
});
