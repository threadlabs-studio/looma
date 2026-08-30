import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(new URL("../../.github/workflows/release.yml", import.meta.url), "utf8");
const prepareJob = workflow.match(/\n  prepare:[\s\S]*?\n  publish:/)?.[0] ?? "";
const publishJob = workflow.match(/\n  publish:[\s\S]*?\n  promote:/)?.[0] ?? "";
const promoteJob = workflow.match(/\n  promote:[\s\S]*$/)?.[0] ?? "";
const promotionEvidenceUpload = promoteJob.match(
  /- name: Upload latest-promotion evidence[\s\S]*?retention-days: 30/
)?.[0] ?? "";
const candidateEvidenceUpload = publishJob.match(
  /- name: Upload candidate registry evidence[\s\S]*?retention-days: 30/
)?.[0] ?? "";
const candidateConsumerEvidenceUpload = publishJob.match(
  /- name: Upload candidate public-consumer evidence[\s\S]*?retention-days: 30/
)?.[0] ?? "";

test("release workflow is manual, main-only, serialized, and environment-protected", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /pull_request:/);
  assert.doesNotMatch(workflow, /\n\s+push:/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /group: looma-npm-release/);
  assert.match(workflow, /environment: npm-release/);
});

test("Candidate publication and latest promotion are separate validated dispatches", () => {
  assert.match(workflow, /candidate_workflow_run_id:/);
  assert.match(workflow, /public_knit_evidence_sha256:/);
  assert.match(workflow, /public_knit_evidence_url:/);
  assert.match(workflow, /hosted_docs_evidence_sha256:/);
  assert.match(workflow, /hosted_docs_evidence_url:/);
  assert.match(workflow, /hosted_docs_url:/);

  const validation = workflow.indexOf("pnpm release:validate-dispatch");
  const releaseVerification = workflow.indexOf("pnpm release:verify");
  assert.ok(validation >= 0);
  assert.ok(releaseVerification > validation);
  for (const step of [
    "Use trusted-publishing-capable npm CLI",
    "Install dependencies",
    "Verify and pack exact release bytes",
    "Upload immutable release artifact set"
  ]) {
    assert.match(
      prepareJob,
      new RegExp(`- name: ${step}\\n\\s+if: inputs\\.promote_latest == false`)
    );
  }
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
  assert.match(promoteJob, /permissions:\n\s+actions: read\n\s+contents: read\n\s+steps:/);
  assert.doesNotMatch(promoteJob, /id-token: write/);
  assert.match(promoteJob, /needs:[\s\S]*?- publish/);
  assert.match(promoteJob, /NODE_AUTH_TOKEN: \$\{\{ secrets\.NPM_TOKEN \}\}/);
});

test("promotion downloads immutable bytes from the prior Candidate workflow run", () => {
  const currentRunUpload = workflow.match(
    /- name: Upload immutable release artifact set[\s\S]*?retention-days: 30/
  )?.[0] ?? "";
  const download = promoteJob.match(
    /- name: Download approved release bytes from Candidate run[\s\S]*?github-token: \$\{\{ github\.token \}\}/
  )?.[0] ?? "";
  assert.match(currentRunUpload, /if: inputs\.promote_latest == false/);
  assert.match(download, /run-id: \$\{\{ inputs\.candidate_workflow_run_id \}\}/);
  assert.match(download, /github-token: \$\{\{ github\.token \}\}/);
  assert.match(promoteJob, /LOOMA_CANDIDATE_WORKFLOW_RUN_ID: \$\{\{ inputs\.candidate_workflow_run_id \}\}/);
  assert.match(promoteJob, /LOOMA_PUBLIC_KNIT_EVIDENCE_SHA256: \$\{\{ inputs\.public_knit_evidence_sha256 \}\}/);
  assert.match(promoteJob, /LOOMA_PUBLIC_KNIT_EVIDENCE_URL: \$\{\{ inputs\.public_knit_evidence_url \}\}/);
  assert.match(promoteJob, /LOOMA_HOSTED_DOCS_EVIDENCE_SHA256: \$\{\{ inputs\.hosted_docs_evidence_sha256 \}\}/);
  assert.match(promoteJob, /LOOMA_HOSTED_DOCS_EVIDENCE_URL: \$\{\{ inputs\.hosted_docs_evidence_url \}\}/);
  assert.match(promoteJob, /LOOMA_HOSTED_DOCS_URL: \$\{\{ inputs\.hosted_docs_url \}\}/);
});

test("publication consumes the verified manifest and starts on candidate", () => {
  assert.match(workflow, /pnpm release:verify/);
  assert.match(workflow, /actions\/upload-artifact@/);
  assert.match(workflow, /actions\/download-artifact@/);
  assert.match(workflow, /publish-release\.mjs --execute --tag candidate/);
  assert.doesNotMatch(workflow, /--tag latest/);
});

test("public consumer proof runs after Candidate verification and immediately before promotion", () => {
  const candidateRegistryVerification = publishJob.indexOf(
    "Verify public candidate metadata, integrity, tags, and provenance"
  );
  const candidateConsumerVerification = publishJob.indexOf(
    "Verify clean public-registry consumer"
  );
  assert.ok(candidateRegistryVerification >= 0);
  assert.ok(candidateConsumerVerification > candidateRegistryVerification);
  assert.match(publishJob, /Setup pnpm/);
  assert.match(publishJob, /pnpm release:verify-public-consumer/);

  const promotionConsumerVerification = promoteJob.indexOf(
    "Reverify clean public-registry consumer before promotion"
  );
  const promotionMutation = promoteJob.indexOf(
    "node tools\/scripts\/promote-release\.mjs --execute"
  );
  assert.ok(promotionConsumerVerification >= 0);
  assert.ok(promotionMutation > promotionConsumerVerification);
  assert.match(
    promoteJob,
    /Reverify clean public-registry consumer before promotion\n\s+run: pnpm release:verify-public-consumer\n\n\s+- name: Promote the complete graph/
  );
  assert.match(promoteJob, /Setup pnpm/);
  assert.match(promoteJob, /pnpm release:verify-public-consumer/);
});

test("candidate evidence upload includes the public consumer result and lockfile", () => {
  assert.match(candidateEvidenceUpload, /path: \.release\/evidence\/registry-candidate\.json/);
  assert.match(candidateEvidenceUpload, /if-no-files-found: error/);
  assert.match(candidateConsumerEvidenceUpload, /\.release\/evidence\/public-consumer\.json/);
  assert.match(candidateConsumerEvidenceUpload, /\.release\/evidence\/public-consumer-pnpm-lock\.yaml/);
  assert.match(candidateConsumerEvidenceUpload, /if-no-files-found: error/);
});

test("promotion evidence is uploaded even when promotion or rollback fails", () => {
  assert.match(promotionEvidenceUpload, /if: always\(\)/);
  assert.match(promotionEvidenceUpload, /if-no-files-found: error/);
});
