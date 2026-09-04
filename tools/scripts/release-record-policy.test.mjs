import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readOptional = async (url) => readFile(url, "utf8").catch(() => "");

const workflow = await readFile(new URL("../../.github/workflows/release.yml", import.meta.url), "utf8");
const changelog = await readOptional(new URL("../../CHANGELOG.md", import.meta.url));
const finalizer = await readOptional(new URL("./finalize-release.mjs", import.meta.url));
const packageJson = JSON.parse(
  await readFile(new URL("../../package.json", import.meta.url), "utf8")
);
const promoteJob = workflow.match(/\n  promote:[\s\S]*?(?=\n  release-record:|$)/)?.[0] ?? "";
const releaseRecordJob = workflow.match(/\n  release-record:[\s\S]*$/)?.[0] ?? "";

test("Candidate changelog records the exact R1 support boundary without claiming remote completion", () => {
  assert.match(changelog, /^# Changelog/m);
  assert.match(changelog, /^## v0\.1\.9 Candidate$/m);
  assert.match(changelog, /one Candidate package[\s\S]*@threadlabs\/looma/);
  assert.doesNotMatch(changelog, /@threadlabs\/looma-(?:tokens|layout|core|editor|vue)/);
  assert.match(changelog, /E-TBL-003/);
  assert.match(changelog, /React[\s\S]*Svelte|Svelte[\s\S]*React/);
  assert.match(changelog, /https:\/\/threadlabs-studio\.github\.io\/looma\//);
  assert.doesNotMatch(changelog, /\b(?:today|currently|now)\b/i);
});

test("release record is a distinct post-promotion job with minimal write permission", () => {
  assert.ok(releaseRecordJob, "release-record job is missing");
  assert.ok(workflow.indexOf("\n  release-record:") > workflow.indexOf("\n  promote:"));
  assert.match(releaseRecordJob, /needs: promote/);
  assert.match(releaseRecordJob, /if: always\(\) && needs\.promote\.result == 'success'/);
  assert.match(releaseRecordJob, /permissions:\n\s+actions: read\n\s+contents: write/);
  assert.doesNotMatch(releaseRecordJob, /id-token: write|packages: write/);
  assert.doesNotMatch(promoteJob, /gh release|git\/refs|finalize-release/);
});

test("release record downloads and validates the exact Candidate and promotion evidence", () => {
  const orchestrator = "node .release/orchestrator/finalize-release.mjs";
  assert.match(releaseRecordJob, /Checkout the same approved release commit/);
  assert.match(releaseRecordJob, /ref: \$\{\{ github\.sha \}\}/);
  assert.match(releaseRecordJob, /persist-credentials: false/);
  assert.match(
    releaseRecordJob,
    /name: looma-0\.1\.9-candidate[\s\S]*?path: \.release\/artifacts\/[\s\S]*?run-id: \$\{\{ inputs\.candidate_workflow_run_id \}\}/
  );
  assert.match(
    releaseRecordJob,
    /name: looma-0\.1\.9-registry-promotion-evidence[\s\S]*?path: \.release\/evidence\/[\s\S]*?run-id: \$\{\{ github\.run_id \}\}/
  );
  assert.match(releaseRecordJob, /node \.release\/orchestrator\/finalize-release\.mjs\n/);
  assert.match(releaseRecordJob, /LOOMA_RELEASE_RECORD: approved/);
  assert.match(releaseRecordJob, /node \.release\/orchestrator\/finalize-release\.mjs --execute/);
  assert.ok(
    releaseRecordJob.indexOf(`${orchestrator}\n`)
      < releaseRecordJob.indexOf(`${orchestrator} --execute`)
  );
});

test("release record policy is fail-closed, resumable, and exposes the release URL", () => {
  assert.equal(packageJson.scripts["release:record"], "node tools/scripts/finalize-release.mjs");
  assert.match(finalizer, /\.release\/artifacts\/release-manifest\.json/);
  assert.match(finalizer, /\.release\/evidence\/registry-promotion\.json/);
  assert.match(finalizer, /LOOMA_RELEASE_RECORD/);
  assert.match(finalizer, /--execute/);
  assert.match(finalizer, /releaseCreationArguments[\s\S]*--target[\s\S]*record\.sourceCommit/);
  assert.match(finalizer, /\.\.\.plan\.uploadAssets/);
  assert.doesNotMatch(finalizer, /repos\/\$\{repository\}\/git\/refs/);
  assert.match(finalizer, /tag ref[\s\S]*does not point to|does not point to[\s\S]*tag ref/i);
  assert.match(finalizer, /release[\s\S]*does not match|does not match[\s\S]*release/i);
  assert.match(finalizer, /gh[\s\S]*release[\s\S]*upload/);
  assert.doesNotMatch(finalizer, /--clobber|force-with-lease|--force/);
  assert.match(releaseRecordJob, /id: release-record/);
  assert.match(releaseRecordJob, /GITHUB_STEP_SUMMARY/);
  assert.match(releaseRecordJob, /steps\.release-record\.outputs\.release_url/);
});
