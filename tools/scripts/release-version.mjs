import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Every manifest that states the release version, plus the release config the scripts read. */
export const VERSIONED_MANIFESTS = [
  "package.json",
  "apps/docs/package.json",
  "apps/storybook/package.json",
  "packages/looma/package.json",
  "tests/release/consumer/package.json",
  "tools/tsconfig/package.json"
];

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseVersion(value) {
  const match = SEMVER.exec(String(value ?? "").trim());
  if (!match) throw new Error(`not a release version: ${value}`);
  return match.slice(1, 4).map(Number);
}

export function isGreater(candidate, current) {
  const left = parseVersion(candidate);
  const right = parseVersion(current);
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index];
  }
  return false;
}

export function nextPatch(version) {
  const [major, minor, patch] = parseVersion(version);
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * A merge that changes the package releases it. The declared version wins when it is ahead, which
 * is how a minor or major lands; otherwise the patch after the published one is taken, so nobody
 * has to remember to bump. Nothing changed means nothing to release.
 */
export function resolveNextVersion({ publishedVersion, declaredVersion, packageChanged }) {
  if (isGreater(declaredVersion, publishedVersion)) {
    return { release: true, version: declaredVersion, reason: "declared version is ahead" };
  }
  if (!packageChanged) {
    return { release: false, version: publishedVersion, reason: "package is unchanged since the last release" };
  }
  return { release: true, version: nextPatch(publishedVersion), reason: "package changed since the last release" };
}

export async function applyVersion(version, { root = repoRoot } = {}) {
  parseVersion(version);
  const written = [];
  for (const manifestPath of VERSIONED_MANIFESTS) {
    const file = path.join(root, manifestPath);
    const source = await readFile(file, "utf8");
    const updated = source.replace(/("version":\s*)"[^"]+"/, `$1"${version}"`);
    if (updated === source) continue;
    await writeFile(file, updated, "utf8");
    written.push(manifestPath);
  }
  const configPath = path.join(root, "tools/scripts/release-config.mjs");
  const config = await readFile(configPath, "utf8");
  const updatedConfig = config.replace(/(RELEASE_VERSION = )"[^"]+"/, `$1"${version}"`);
  if (updatedConfig !== config) {
    await writeFile(configPath, updatedConfig, "utf8");
    written.push("tools/scripts/release-config.mjs");
  }
  return written;
}

async function main() {
  const [command, value] = process.argv.slice(2);
  if (command === "--apply") {
    const written = await applyVersion(value);
    process.stdout.write(`${written.join("\n")}\n`);
    return;
  }
  if (command === "--resolve") {
    const declaredVersion = JSON.parse(
      await readFile(path.join(repoRoot, "packages/looma/package.json"), "utf8")
    ).version;
    const resolution = resolveNextVersion({
      publishedVersion: process.env.LOOMA_PUBLISHED_VERSION,
      declaredVersion,
      packageChanged: process.env.LOOMA_PACKAGE_CHANGED === "true"
    });
    process.stdout.write(`${JSON.stringify(resolution)}\n`);
    return;
  }
  throw new Error("usage: release-version.mjs --resolve | --apply <version>");
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
