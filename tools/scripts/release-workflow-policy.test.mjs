import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const workflow = await readFile(new URL("../../.github/workflows/release.yml", import.meta.url), "utf8");
const ciWorkflow = await readFile(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
const registryPreflight = await readFile(new URL("./registry-preflight.mjs", import.meta.url), "utf8");
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const rootLicense = await readFile(new URL("../../LICENSE", import.meta.url));
const packageLicense = await readFile(new URL("../../packages/looma/LICENSE", import.meta.url));
const docsPreviewWorkflow = await readFile(
  new URL("../../.github/workflows/docs-preview.yml", import.meta.url),
  "utf8"
);
const docsProductionWorkflow = await readFile(
  new URL("../../.github/workflows/docs-production.yml", import.meta.url),
  "utf8"
);
const prepareJob = workflow.match(/\n  prepare:[\s\S]*?\n  publish:/)?.[0] ?? "";
const publishJob = workflow.match(/\n  publish:[\s\S]*?\n  promote:/)?.[0] ?? "";
const promoteJob = workflow.match(/\n  promote:[\s\S]*?(?=\n  release-record:|$)/)?.[0] ?? "";
const releaseRecordJob = workflow.match(/\n  release-record:[\s\S]*$/)?.[0] ?? "";
const promotionEvidenceUpload = promoteJob.match(
  /- name: Upload latest-promotion evidence[\s\S]*?retention-days: 30/
)?.[0] ?? "";
const candidateEvidenceUpload = publishJob.match(
  /- name: Upload candidate registry evidence[\s\S]*?retention-days: 30/
)?.[0] ?? "";
const candidateConsumerEvidenceUpload = publishJob.match(
  /- name: Upload candidate public-consumer evidence[\s\S]*?retention-days: 30/
)?.[0] ?? "";
const ciRunValidation = prepareJob.match(
  /- name: Validate successful main CI for this exact commit[\s\S]*?(?=\n\s+- name:)/
)?.[0] ?? "";
const releasePackagingJob = ciWorkflow.match(
  /\n  release-package:[\s\S]*?(?=\n  [a-zA-Z0-9_-]+:|$)/
)?.[0] ?? "";
const ciReleaseVerification = releasePackagingJob.match(
  /- name: Verify release packaging[\s\S]*?(?=\n\s+- name:|$)/
)?.[0] ?? "";
const bootstrapPreflight = publishJob.match(
  /- name: Prove scope ownership and release version availability[\s\S]*?(?=\n\s+- name:)/
)?.[0] ?? "";
const bootstrapPublish = publishJob.match(
  /- name: Publish exact bytes with the bootstrap credential[\s\S]*?(?=\n\s+- name:)/
)?.[0] ?? "";
const trustedPublish = publishJob.match(
  /- name: Publish exact bytes with trusted publishing[\s\S]*?(?=\n\s+- name:)/
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
  assert.match(workflow, /ci_workflow_run_id:/);
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
  assert.match(prepareJob, /LOOMA_CI_WORKFLOW_RUN_ID: \$\{\{ inputs\.ci_workflow_run_id \}\}/);
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

test("ordinary CI qualifies the same tracked package inputs used by release", () => {
  assert.match(releasePackagingJob, /node-version: 20\.19\.6/);
  assert.match(releasePackagingJob, /npm install --global npm@11\.5\.1/);
  assert.match(releasePackagingJob, /pnpm install --frozen-lockfile/);
  assert.doesNotMatch(releasePackagingJob, /pnpm (?:build|test)/);
  assert.match(ciReleaseVerification, /^\s+run: pnpm release:verify$/m);
  assert.doesNotMatch(ciReleaseVerification, /release:verify:/);
  for (const approver of [
    "LOOMA_NPM_APPROVER",
    "LOOMA_DOCS_APPROVER",
    "LOOMA_KNIT_APPROVER"
  ]) {
    assert.match(ciReleaseVerification, new RegExp(`${approver}: CI`));
  }
  execFileSync("git", ["ls-files", "--error-unmatch", "packages/looma/LICENSE"], {
    cwd: repoRoot,
    stdio: "ignore"
  });
  assert.deepEqual(packageLicense, rootLicense);
});

test("Candidate publication is bound to a successful push CI run for main at the exact release SHA", () => {
  assert.match(ciRunValidation, /if: inputs\.publish_candidate/);
  assert.match(ciRunValidation, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(ciRunValidation, /LOOMA_CI_WORKFLOW_RUN_ID: \$\{\{ inputs\.ci_workflow_run_id \}\}/);
  assert.match(ciRunValidation, /LOOMA_EXPECTED_HEAD_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(ciRunValidation, /gh api ["']repos\/\$\{GITHUB_REPOSITORY\}\/actions\/runs\/\$\{LOOMA_CI_WORKFLOW_RUN_ID\}["']/);
  assert.match(ciRunValidation, /\.path == "\.github\/workflows\/ci\.yml"/);
  assert.match(ciRunValidation, /\.event == "push"/);
  assert.match(ciRunValidation, /\.head_branch == "main"/);
  assert.match(ciRunValidation, /\.conclusion == "success"/);
  assert.match(ciRunValidation, /\.head_sha == \$expected_sha/);

  const ciValidation = prepareJob.indexOf("Validate successful main CI for this exact commit");
  const artifactPreparation = prepareJob.indexOf("Use trusted-publishing-capable npm CLI");
  assert.ok(ciValidation >= 0);
  assert.ok(artifactPreparation > ciValidation);
  assert.match(publishJob, /needs: prepare/);
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
  assert.match(prepareJob, /permissions:\n\s+actions: read\n\s+contents: read/);
  assert.match(publishJob, /permissions:\n\s+contents: read\n\s+id-token: write/);
  for (const job of [prepareJob, publishJob, promoteJob]) {
    assert.doesNotMatch(job, /contents:\s+write/);
  }
  assert.doesNotMatch(workflow, /packages:\s+write/);
  assert.match(publishJob, /registry-url: https:\/\/registry\.npmjs\.org\//);
  assert.match(promoteJob, /permissions:\n\s+actions: read\n\s+contents: read\n\s+steps:/);
  assert.doesNotMatch(promoteJob, /id-token: write/);
  assert.match(promoteJob, /needs:[\s\S]*?- publish/);
  assert.match(promoteJob, /NODE_AUTH_TOKEN: \$\{\{ secrets\.NPM_TOKEN \}\}/);
  assert.match(releaseRecordJob, /permissions:\n\s+actions: read\n\s+contents: write/);
  assert.doesNotMatch(releaseRecordJob, /id-token: write|packages: write/);
});

test("bootstrap identity preflight is isolated from the bypass-2FA publishing credential", () => {
  assert.match(bootstrapPreflight, /NODE_AUTH_TOKEN: \$\{\{ secrets\.NPM_PREFLIGHT_TOKEN \}\}/);
  assert.doesNotMatch(bootstrapPreflight, /secrets\.NPM_TOKEN/);
  assert.match(bootstrapPublish, /NODE_AUTH_TOKEN: \$\{\{ secrets\.NPM_TOKEN \}\}/);
  assert.doesNotMatch(bootstrapPublish, /secrets\.NPM_PREFLIGHT_TOKEN/);
  assert.equal([...workflow.matchAll(/secrets\.NPM_PREFLIGHT_TOKEN/g)].length, 1);
  assert.equal([...workflow.matchAll(/secrets\.NPM_TOKEN/g)].length, 2);
  assert.doesNotMatch(trustedPublish, /NODE_AUTH_TOKEN|secrets\./);
  assert.doesNotMatch(publishJob, /\n    env:\n/);
});

test("read-only registry preflight does not require npm account-profile access", () => {
  assert.doesNotMatch(registryPreflight, /\["profile", "get"/);
  assert.doesNotMatch(registryPreflight, /twoFactorMode/);
});

test("release pack, publish, and promotion jobs use the exact declared Node runtime", () => {
  for (const job of [prepareJob, publishJob, promoteJob]) {
    assert.match(job, /node-version: 20\.19\.6/);
    assert.doesNotMatch(job, /node-version: (?!20\.19\.6)/);
  }
  assert.match(workflow, /npm install --global npm@11\.5\.1/);
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
  assert.match(publishJob, /timeout-minutes: 30/);
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

test("docs preview explicitly builds non-indexable preview content", () => {
  assert.match(docsPreviewWorkflow, /LOOMA_DOCS_RELEASE_MODE: preview/);
  const facadeBuild = docsPreviewWorkflow.indexOf("run: pnpm build:facade");
  const docsBuild = docsPreviewWorkflow.indexOf("run: pnpm --filter @threadlabs/looma-docs build");
  assert.ok(facadeBuild >= 0, "docs preview must build the workspace facade");
  assert.ok(docsBuild > facadeBuild, "docs preview must build the facade before Docusaurus");
});

test("production docs use a protected manual same-commit Candidate deployment", () => {
  assert.match(docsProductionWorkflow, /workflow_dispatch:/);
  assert.doesNotMatch(docsProductionWorkflow, /pull_request:|\n\s+push:/);
  assert.match(docsProductionWorkflow, /candidate_workflow_run_id:/);
  assert.match(docsProductionWorkflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(docsProductionWorkflow, /environment:\n\s+name: docs-production/);
  assert.match(docsProductionWorkflow, /actions: read/);
  assert.match(docsProductionWorkflow, /run-id: \$\{\{ inputs\.candidate_workflow_run_id \}\}/);
  assert.match(docsProductionWorkflow, /github-token: \$\{\{ github\.token \}\}/);
  assert.match(docsProductionWorkflow, /--checkout-commit "\$\(git rev-parse HEAD\)"/);
  assert.match(docsProductionWorkflow, /--manifest-only/);
  assert.match(docsProductionWorkflow, /--registry-evidence \.release\/evidence\/candidate-registry\/registry-candidate\.json/);
  assert.match(docsProductionWorkflow, /LOOMA_DOCS_RELEASE_MODE: candidate/);
  const facadeBuild = docsProductionWorkflow.indexOf("run: pnpm build:facade");
  const docsBuild = docsProductionWorkflow.indexOf(
    "run: pnpm --filter @threadlabs/looma-docs build"
  );
  assert.ok(facadeBuild >= 0, "production docs must build the workspace facade");
  assert.ok(docsBuild > facadeBuild, "production docs must build the facade before Docusaurus");
  assert.match(docsProductionWorkflow, /verify-hosted-docs\.mjs/);
  assert.match(docsProductionWorkflow, /hosted-docs\.json/);
  assert.match(docsProductionWorkflow, /steps\.evidence-upload\.outputs\.artifact-url/);
});

test("production docs pin actions and disable checkout credentials", () => {
  const uses = [...docsProductionWorkflow.matchAll(/uses:\s+([^\s#]+)/g)].map(
    (match) => match[1]
  );
  assert.ok(uses.length > 0);
  for (const action of uses) {
    assert.match(action, /^[^@]+@[a-f0-9]{40}$/);
  }
  assert.doesNotMatch(docsProductionWorkflow, /uses:\s+[^\s]+@v\d/);
  assert.match(docsProductionWorkflow, /persist-credentials:\s+false/);
});
