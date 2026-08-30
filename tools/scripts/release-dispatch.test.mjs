import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  validatePromotionEvidence,
  validateReleaseDispatch
} from "./release-dispatch.mjs";

const sha256 = "a".repeat(64);
const promotionInput = {
  candidateWorkflowRunId: "123456789",
  publicKnitEvidenceSha256: sha256,
  publicKnitEvidenceUrl: "https://github.com/threadlabs-studio/knit/actions/runs/987654321/artifacts/1234",
  hostedDocsEvidenceSha256: "b".repeat(64),
  hostedDocsEvidenceUrl: "https://github.com/threadlabs-studio/looma/actions/runs/123456789/artifacts/5678",
  hostedDocsUrl: "https://threadlabs-studio.github.io/looma/",
  githubServerUrl: "https://github.com",
  githubRepository: "threadlabs-studio/looma"
};

test("allows preparation-only and Candidate-only dispatches", () => {
  assert.equal(validateReleaseDispatch({
    publishCandidate: false,
    promoteLatest: false
  }).mode, "prepare");
  assert.equal(validateReleaseDispatch({
    publishCandidate: "true",
    promoteLatest: "false"
  }).mode, "publish-candidate");
});

test("rejects publishing Candidate and promoting latest in one dispatch", () => {
  assert.throws(
    () => validateReleaseDispatch({
      publishCandidate: true,
      promoteLatest: true,
      ...promotionInput
    }),
    /separate workflow dispatches/i
  );
});

test("accepts promotion only with complete auditable evidence", () => {
  const dispatch = validateReleaseDispatch({
    publishCandidate: false,
    promoteLatest: true,
    ...promotionInput
  });

  assert.equal(dispatch.mode, "promote-latest");
  assert.deepEqual(dispatch.promotionEvidence, {
    candidateWorkflowRunId: "123456789",
    candidateWorkflowRunUrl: "https://github.com/threadlabs-studio/looma/actions/runs/123456789",
    publicKnitEvidenceSha256: sha256,
    publicKnitEvidenceUrl: "https://github.com/threadlabs-studio/knit/actions/runs/987654321/artifacts/1234",
    hostedDocsEvidenceSha256: "b".repeat(64),
    hostedDocsEvidenceUrl: "https://github.com/threadlabs-studio/looma/actions/runs/123456789/artifacts/5678",
    hostedDocsUrl: "https://threadlabs-studio.github.io/looma/"
  });
});

test("rejects missing or malformed promotion evidence", () => {
  for (const [field, value] of [
    ["candidateWorkflowRunId", ""],
    ["candidateWorkflowRunId", "12.3"],
    ["publicKnitEvidenceSha256", "abc"],
    ["publicKnitEvidenceUrl", ""],
    ["publicKnitEvidenceUrl", "https://user:secret@example.com/evidence.json"],
    ["publicKnitEvidenceUrl", "https://example.com/evidence.json?token=secret"],
    ["hostedDocsEvidenceSha256", "g".repeat(64)],
    ["hostedDocsEvidenceUrl", "http://example.com/docs-evidence.json"],
    ["hostedDocsUrl", "http://threadlabs-studio.github.io/looma/"],
    ["hostedDocsUrl", "not-a-url"]
  ]) {
    assert.throws(
      () => validatePromotionEvidence({ ...promotionInput, [field]: value }),
      new RegExp(field, "i")
    );
  }
});

test("direct promotion execution fails closed before reading a manifest when evidence locations are absent", () => {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("./promote-release.mjs", import.meta.url)), "--execute", "--manifest", "missing.json"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        LOOMA_CANDIDATE_WORKFLOW_RUN_ID: promotionInput.candidateWorkflowRunId,
        LOOMA_PUBLIC_KNIT_EVIDENCE_SHA256: promotionInput.publicKnitEvidenceSha256,
        LOOMA_PUBLIC_KNIT_EVIDENCE_URL: "",
        LOOMA_HOSTED_DOCS_EVIDENCE_SHA256: promotionInput.hostedDocsEvidenceSha256,
        LOOMA_HOSTED_DOCS_EVIDENCE_URL: "",
        LOOMA_HOSTED_DOCS_URL: promotionInput.hostedDocsUrl,
        GITHUB_SERVER_URL: promotionInput.githubServerUrl,
        GITHUB_REPOSITORY: promotionInput.githubRepository
      }
    }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /publicKnitEvidenceUrl/i);
  assert.doesNotMatch(result.stderr, /ENOENT|missing\.json/);
});
