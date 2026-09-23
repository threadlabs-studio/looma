import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const read = (relativePath) => readFile(new URL(`../../${relativePath}`, import.meta.url), "utf8");
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const [workflow, ciWorkflow, docsWorkflow] = await Promise.all([
  read(".github/workflows/release.yml"),
  read(".github/workflows/ci.yml"),
  read(".github/workflows/docs.yml")
]);
// A job runs from its name to the next job at the same indentation.
const job = (name) =>
  workflow.match(new RegExp(`\\n  ${name}:\\n[\\s\\S]*?(?=\\n  [a-zA-Z0-9_-]+:\\n|$)`))?.[0] ?? "";
const [prepareJob, recordJob, publishJob] = ["prepare", "record", "publish"].map(job);
const releasePackagingJob = ciWorkflow.match(
  /\n  release-package:[\s\S]*?(?=\n  [a-zA-Z0-9_-]+:|$)/
)?.[0] ?? "";

const afterGreenMain = (source) => {
  assert.match(source, /workflow_run:\n\s+workflows: \["CI"\]\n\s+types: \[completed\]\n\s+branches: \[main\]/);
  assert.match(source, /github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(source, /github\.event\.workflow_run\.head_branch == 'main'/);
  assert.match(source, /ref: \$\{\{ (?:github\.event\.workflow_run\.head_sha \|\| github\.sha|needs\.prepare\.outputs\.release_sha|steps\.sha\.outputs\.release_sha) \}\}/);
  assert.doesNotMatch(source, /pull_request:/);
};

test("release publishes to latest after CI passes on main", () => {
  afterGreenMain(workflow);
  assert.match(workflow, /group: looma-npm-release/);
  assert.match(publishJob, /needs\.prepare\.outputs\.releasing == 'true'/);
  assert.match(publishJob, /publish-release\.mjs --execute/);
  assert.match(publishJob, /pnpm release:verify-registry/);
  assert.match(publishJob, /pnpm release:verify-public-consumer/);
  assert.doesNotMatch(workflow, /candidate/i);
});

test("publication uses only repository-bound trusted publishing", () => {
  assert.match(publishJob, /environment: npm-release/);
  assert.match(publishJob, /permissions:\n\s+contents: read\n\s+id-token: write/);
  assert.match(publishJob, /LOOMA_RELEASE_PUBLISH: approved/);
  assert.doesNotMatch(workflow, /secrets\.|NODE_AUTH_TOKEN/);
  // Only the job that records the release tag may write, and it never publishes.
  assert.equal([...workflow.matchAll(/contents: write/g)].length, 1);
  assert.match(recordJob, /contents: write/);
  assert.doesNotMatch(recordJob, /id-token|publish-release/);
  assert.doesNotMatch(publishJob, /contents: write/);
  assert.doesNotMatch(prepareJob, /contents: write/);
});

test("a merge that changes the package releases itself", () => {
  // No manual bump: the version comes from the registry and the package's own diff.
  assert.match(prepareJob, /npm view @threadlabs\/looma version/);
  assert.match(prepareJob, /git diff --name-only "\$last_release"\.\.HEAD -- packages\/looma\/src/);
  assert.match(prepareJob, /release-version\.mjs --resolve/);
  // Packing needs a clean tree, so the stamped version is committed -- in the runner only, and
  // before packing, so the pack records that commit as its source.
  assert.match(prepareJob, /release-commit\.mjs "\$VERSION"/);
  assert.ok(prepareJob.indexOf("release-commit.mjs") < prepareJob.indexOf("pnpm release:verify"));
  // main takes pull requests only, so no job pushes to it: a push there fails every release.
  assert.doesNotMatch(workflow, /HEAD:main|git push origin main/);
  assert.doesNotMatch(prepareJob, /git push/);
  // Publish refuses any checkout but the packed source, so it rebuilds that exact commit, and
  // record tags the same one, so the tag holds exactly what was published.
  for (const later of [publishJob, recordJob]) {
    assert.match(later, /release-commit\.mjs "\$VERSION" "\$RELEASE_COMMIT"/);
  }
  assert.ok(publishJob.indexOf("release-commit.mjs") < publishJob.indexOf("publish-release.mjs"));
  // The tag is what stops the next run from releasing again. It is annotated, because
  // `--follow-tags` skips lightweight tags, and it is written only after publish succeeds.
  assert.match(recordJob, /needs: \[prepare, publish\]/);
  assert.match(recordJob, /git tag -a "v\$\{VERSION\}"/);
  assert.match(recordJob, /git push origin "refs\/tags\/v\$\{VERSION\}"/);
});

test("docs deploy to Pages after CI passes on main", () => {
  afterGreenMain(docsWorkflow);
  assert.match(docsWorkflow, /pages: write/);
  const packageBuild = docsWorkflow.indexOf("run: pnpm --filter @threadlabs/looma build");
  const docsBuild = docsWorkflow.indexOf("run: pnpm --filter @threadlabs/looma-docs build");
  assert.ok(packageBuild >= 0 && docsBuild > packageBuild, "docs must build the package first");
  assert.match(docsWorkflow, /actions\/deploy-pages@/);
});

test("ordinary CI qualifies the same package inputs used by release", async () => {
  assert.match(releasePackagingJob, /node-version: 20\.19\.6/);
  assert.match(releasePackagingJob, /pnpm install --frozen-lockfile/);
  assert.match(releasePackagingJob, /^\s+run: pnpm release:verify$/m);
  execFileSync("git", ["ls-files", "--error-unmatch", "packages/looma/LICENSE"], {
    cwd: repoRoot,
    stdio: "ignore"
  });
  assert.deepEqual(
    await readFile(new URL("../../packages/looma/LICENSE", import.meta.url)),
    await readFile(new URL("../../LICENSE", import.meta.url))
  );
});

test("workflows pin actions to commits and disable checkout credentials", () => {
  for (const source of [workflow, docsWorkflow]) {
    const uses = [...source.matchAll(/uses:\s+([^\s#]+)/g)].map((match) => match[1]);
    assert.ok(uses.length > 0);
    for (const action of uses) assert.match(action, /^[^@]+@[a-f0-9]{40}$/);
    // The record job pushes the release tag, so it keeps its credentials; nothing else does.
    const checkouts = [...source.matchAll(/actions\/checkout@/g)].length;
    const withoutCredentials = [...source.matchAll(/persist-credentials:\s+false/g)].length;
    const pushes = [...source.matchAll(/git push origin/g)].length;
    assert.equal(withoutCredentials + pushes, checkouts);
  }
});
