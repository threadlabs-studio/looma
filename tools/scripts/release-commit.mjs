#!/usr/bin/env node
// Stamps the release version onto the checked-out source and commits it reproducibly.
//
// main only takes pull requests, so a release commit never reaches it. Each release job instead
// rebuilds the same commit from the same source: a fixed identity, the source commit's own
// timestamps, and a fixed message give the same hash every time. prepare packs from it (the pack
// records it as `sourceCommit`), publish must be standing on it for that check to pass, and record
// tags it, so the tag's tree is exactly what was published.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyVersion } from "./release-version.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const IDENTITY = { name: "github-actions[bot]", email: "41898282+github-actions[bot]@users.noreply.github.com" };

function git(root, args, env = {}) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", env: { ...process.env, ...env } });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

/**
 * @contract Returns the commit to release. A version already declared in the source needs no stamp,
 * so that is the source commit itself; otherwise it is a new commit whose only change is the version.
 * @invariant The same source and version always give the same hash, in any job or runner.
 * @failure Throws when `expected` is given and the result differs: releasing a different commit
 * from the one that was packed would publish bytes nobody verified.
 */
export async function createReleaseCommit(version, { root = repoRoot, expected } = {}) {
  await applyVersion(version, { root });
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
  createReleaseCommit(version, { expected: expected || undefined })
    .then((commit) => process.stdout.write(`${commit}\n`))
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
