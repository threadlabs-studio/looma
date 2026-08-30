import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(new URL("../../.github/workflows/release.yml", import.meta.url), "utf8");
const publishJob = workflow.match(/\n  publish:[\s\S]*?\n  promote:/)?.[0] ?? "";
const promoteJob = workflow.match(/\n  promote:[\s\S]*$/)?.[0] ?? "";
const promotionEvidenceUpload = promoteJob.match(
  /- name: Upload latest-promotion evidence[\s\S]*?retention-days: 30/
)?.[0] ?? "";

test("release workflow is manual, main-only, serialized, and environment-protected", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /pull_request:/);
  assert.doesNotMatch(workflow, /\n\s+push:/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /group: looma-npm-release/);
  assert.match(workflow, /environment: npm-release/);
});

test("every third-party action is pinned to a full commit SHA", () => {
  const uses = [...workflow.matchAll(/uses:\s+([^\s#]+)/g)].map((match) => match[1]);
  assert.ok(uses.length > 0);
  for (const action of uses) {
    assert.match(action, /^[^@]+@[a-f0-9]{40}$/);
  }
  assert.doesNotMatch(workflow, /uses:\s+[^\s]+@v\d/);
});

test("checkout credentials are disabled and publication has only required permissions", () => {
  const checkoutCount = [...workflow.matchAll(/actions\/checkout@/g)].length;
  const disabledCredentialCount = [...workflow.matchAll(/persist-credentials:\s+false/g)].length;
  assert.equal(disabledCredentialCount, checkoutCount);
  assert.match(publishJob, /permissions:\n\s+contents: read\n\s+id-token: write/);
  assert.doesNotMatch(workflow, /contents:\s+write/);
  assert.doesNotMatch(workflow, /packages:\s+write/);
  assert.match(publishJob, /registry-url: https:\/\/registry\.npmjs\.org\//);
  assert.match(promoteJob, /permissions:\n\s+contents: read\n\s+steps:/);
  assert.doesNotMatch(promoteJob, /id-token: write/);
  assert.match(promoteJob, /needs:[\s\S]*?- publish/);
  assert.match(promoteJob, /NODE_AUTH_TOKEN: \$\{\{ secrets\.NPM_TOKEN \}\}/);
});

test("publication consumes the verified manifest and starts on candidate", () => {
  assert.match(workflow, /pnpm release:verify/);
  assert.match(workflow, /actions\/upload-artifact@/);
  assert.match(workflow, /actions\/download-artifact@/);
  assert.match(workflow, /publish-release\.mjs --execute --tag candidate/);
  assert.doesNotMatch(workflow, /--tag latest/);
});

test("promotion evidence is uploaded even when promotion or rollback fails", () => {
  assert.match(promotionEvidenceUpload, /if: always\(\)/);
  assert.match(promotionEvidenceUpload, /if-no-files-found: error/);
});
