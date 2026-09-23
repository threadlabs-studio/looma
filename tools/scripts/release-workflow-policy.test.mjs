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
const publishJob = workflow.match(/\n  publish:[\s\S]*$/)?.[0] ?? "";
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
  // Only the job that records the release commit may write, and it never publishes.
  assert.equal([...workflow.matchAll(/contents: write/g)].length, 1);
  assert.doesNotMatch(publishJob, /contents: write/);
});

test("a merge that changes the package releases itself", () => {
  const prepareJob = workflow.match(/\n  prepare:[\s\S]*?\n  publish:/)?.[0] ?? "";
  // No manual bump: the version comes from the registry and the package's own diff.
  assert.match(prepareJob, /npm view @threadlabs\/looma version/);
  assert.match(prepareJob, /git diff --name-only "\$last_release"\.\.HEAD -- packages\/looma\/src/);
  assert.match(prepareJob, /release-version\.mjs --resolve/);
  assert.match(prepareJob, /release-version\.mjs --apply/);
  // The release commit and its tag are what stop the next run from releasing again.
  assert.match(prepareJob, /git commit -aqm "Release v\$\{VERSION\}"/);
  assert.match(prepareJob, /git tag "v\$\{VERSION\}"/);
  assert.match(prepareJob, /git push origin "HEAD:main" --follow-tags/);
  // Packing happens after that commit, so the manifest's source is the commit that is published.
  assert.ok(prepareJob.indexOf("--apply") < prepareJob.indexOf("pnpm release:verify"));
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
    // The prepare job pushes the release commit, so it keeps its credentials; nothing else does.
    const checkouts = [...source.matchAll(/actions\/checkout@/g)].length;
    const withoutCredentials = [...source.matchAll(/persist-credentials:\s+false/g)].length;
    const pushes = [...source.matchAll(/git push origin/g)].length;
    assert.equal(withoutCredentials + pushes, checkouts);
  }
});
