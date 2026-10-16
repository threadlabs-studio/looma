#!/usr/bin/env node
// Stamps the release version onto the checked-out source and commits it reproducibly.
//
// main only takes pull requests, so a release commit never reaches it. Each release job instead
// rebuilds the same commit from the same source: a fixed identity, the source commit's own
// timestamps, and a fixed message give the same hash every time. prepare packs from it (the pack
// records it as `sourceCommit`), publish must be standing on it for that check to pass, and record
// tags it, so the tag's tree is exactly what was published.
import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyVersion, isGreater, stampChangelog } from "./release-version.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const IDENTITY = { name: "github-actions[bot]", email: "41898282+github-actions[bot]@users.noreply.github.com" };

function git(root, args, env = {}) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", env: { ...process.env, ...env } });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

/**
 * The CHANGELOG of the newest `vX.Y.Z` tag below `version` (any tag without one), or "" with no
 * such tag. Every release job checks out tags, so each one reads the same text.
 */
function releasedChangelog(root, version) {
  const tag = git(root, ["tag", "--list", "v*", "--sort=-v:refname"])
    .split("\n")
    .find((name) => /^v\d+\.\d+\.\d+$/.test(name) && (!version || isGreater(version, name.slice(1))));
  return tag ? git(root, ["show", `${tag}:CHANGELOG.md`]) : "";
}

/** Writes `CHANGELOG.md` stamped for `version`, or with only shipped entries filed when it is omitted. */
export async function stampReleaseChangelog(version, { root = repoRoot } = {}) {
  const file = path.join(root, "CHANGELOG.md");
  const source = await readFile(file, "utf8").catch(() => null);
  if (source === null) return;
  const stamped = stampChangelog(source, { version, released: releasedChangelog(root, version) });
  if (stamped !== source) await writeFile(file, stamped, "utf8");
}

/**
 * @contract Returns the commit to release. A version already declared in the source needs no stamp,
 * and no `## Next release` heading to name, so that is the source commit itself; otherwise it is a new
 * commit whose only changes are the version and the CHANGELOG heading.
 * @invariant The same source and version always give the same hash, in any job or runner.
 * @failure Throws when `expected` is given and the result differs: releasing a different commit
 * from the one that was packed would publish bytes nobody verified.
 */
export async function createReleaseCommit(version, { root = repoRoot, expected } = {}) {
  await applyVersion(version, { root });
  await stampReleaseChangelog(version, { root });
  if (git(root, ["status", "--porcelain"]) !== "") {
    const sourceDate = git(root, ["show", "-s", "--format=%cI", "HEAD"]);
    git(root, ["-c", "commit.gpgsign=false", "commit", "-aqm", `Release v${version}`], {
      GIT_AUTHOR_NAME: IDENTITY.name,
      GIT_AUTHOR_EMAIL: IDENTITY.email,
      GIT_AUTHOR_DATE: sourceDate,
      GIT_COMMITTER_NAME: IDENTITY.name,
      GIT_COMMITTER_EMAIL: IDENTITY.email,
      GIT_COMMITTER_DATE: sourceDate,
    });
  }
  const commit = git(root, ["rev-parse", "HEAD"]);
  if (expected && commit !== expected) {
    throw new Error(`release commit ${commit} does not match the packed release ${expected}`);
  }
  return commit;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const [version, expected] = process.argv.slice(2);
  // `--changelog` files main's shipped Next release entries under their versions; nothing is committed.
  const run = version === "--changelog"
    ? stampReleaseChangelog(undefined).then(() => "CHANGELOG.md")
    : createReleaseCommit(version, { expected: expected || undefined });
  run
    .then((output) => process.stdout.write(`${output}\n`))
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
