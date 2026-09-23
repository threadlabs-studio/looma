#!/usr/bin/env node
// Fails when main carries published-surface changes that no version bump will publish.
//
// Releases publish on a version change, so a fix merged without one sits on main, invisible on npm
// and easy to re-report or work around. This compares the version in packages/looma/package.json
// against the registry: if that version is already published, nothing in the package may have
// changed since the commit that set it.
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// What ships: the package's own sources and manifest.
const publishedPaths = ["packages/looma/src", "packages/looma/package.json", "packages/looma/build.mjs"];

function git(...args) {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function publishedVersions(name) {
  const result = spawnSync(
    "npm",
    ["view", name, "versions", "--json", "--registry", "https://registry.npmjs.org/"],
    { encoding: "utf8" },
  );
  if (result.status !== 0) return undefined;
  try {
    const value = JSON.parse(result.stdout);
    return new Set(Array.isArray(value) ? value : [value]);
  } catch {
    return undefined;
  }
}

const manifest = JSON.parse(await readFile(path.join(repoRoot, "packages/looma/package.json"), "utf8"));
const versions = publishedVersions(manifest.name);
if (versions === undefined) {
  process.stdout.write(`Could not read published versions of ${manifest.name}; skipping.\n`);
  process.exit(0);
}
if (!versions.has(manifest.version)) {
  process.stdout.write(`${manifest.name}@${manifest.version} is not published yet; merging main releases it.\n`);
  process.exit(0);
}

function versionAt(commit) {
  const result = spawnSync("git", ["show", `${commit}:packages/looma/package.json`], { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) return undefined;
  try {
    return JSON.parse(result.stdout).version;
  } catch {
    return undefined;
  }
}

// The release commit is the one that set the current version. It is often a merge commit, which
// `git log -S` skips, so walk the first-parent history and find where the version changed.
const history = git("log", "--first-parent", "--format=%H", "-n", "300").split("\n").filter(Boolean);
let releaseCommit = "";
for (const commit of history) {
  if (versionAt(commit) !== manifest.version) break;
  releaseCommit = commit;
}
if (!releaseCommit) {
  process.stderr.write(
    `${manifest.name}@${manifest.version} is published, but no commit in the last 300 sets it.\n`
      + "Check that packages/looma/package.json carries the version you mean to publish.\n",
  );
  process.exit(1);
}
const changed = git("diff", "--name-only", `${releaseCommit}..HEAD`, "--", ...publishedPaths)
  .split("\n")
  .filter(Boolean);

if (changed.length === 0) {
  process.stdout.write(`${manifest.name}@${manifest.version} matches the published package.\n`);
  process.exit(0);
}

process.stderr.write(
  `${manifest.name}@${manifest.version} is already published, but the package changed since it was released:\n`
    + changed.map((file) => `  ${file}\n`).join("")
    + "\nBump the version in packages/looma/package.json (and the changelog) so merging publishes these changes.\n",
);
process.exit(1);
