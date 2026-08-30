import path from "node:path";
import { fileURLToPath } from "node:url";

const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const RUN_ID_PATTERN = /^[1-9][0-9]*$/;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function dispatchBoolean(value, name) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw new Error(`${name} must be true or false`);
}

function sha256(value, name) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new Error(`${name} must be a 64-hex SHA-256 digest`);
  }
  return value.toLowerCase();
}

function httpsUrl(value, name) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid HTTPS URL`);
  }
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password) {
    throw new Error(`${name} must be a valid HTTPS URL without credentials`);
  }
  return url;
}

function evidenceUrl(value, name) {
  const url = httpsUrl(value, name);
  if (url.search || url.hash) {
    throw new Error(`${name} must be a credential-free HTTPS URL without query parameters or fragments`);
  }
  return url.href;
}

export function validatePromotionEvidence({
  candidateWorkflowRunId,
  publicKnitEvidenceSha256,
  publicKnitEvidenceUrl,
  hostedDocsEvidenceSha256,
  hostedDocsEvidenceUrl,
  hostedDocsUrl,
  githubServerUrl,
  githubRepository
}) {
  if (typeof candidateWorkflowRunId !== "string" || !RUN_ID_PATTERN.test(candidateWorkflowRunId)) {
    throw new Error("candidateWorkflowRunId must be a positive numeric GitHub Actions run ID");
  }
  if (typeof githubRepository !== "string" || !REPOSITORY_PATTERN.test(githubRepository)) {
    throw new Error("githubRepository must be an owner/repository pair");
  }

  const serverUrl = httpsUrl(githubServerUrl, "githubServerUrl");
  const docsUrl = httpsUrl(hostedDocsUrl, "hostedDocsUrl");
  const candidateWorkflowRunUrl = new URL(
    `${githubRepository}/actions/runs/${candidateWorkflowRunId}`,
    `${serverUrl.href.replace(/\/$/, "")}/`
  ).href;

  return {
    candidateWorkflowRunId,
    candidateWorkflowRunUrl,
    publicKnitEvidenceSha256: sha256(publicKnitEvidenceSha256, "publicKnitEvidenceSha256"),
    publicKnitEvidenceUrl: evidenceUrl(publicKnitEvidenceUrl, "publicKnitEvidenceUrl"),
    hostedDocsEvidenceSha256: sha256(hostedDocsEvidenceSha256, "hostedDocsEvidenceSha256"),
    hostedDocsEvidenceUrl: evidenceUrl(hostedDocsEvidenceUrl, "hostedDocsEvidenceUrl"),
    hostedDocsUrl: docsUrl.href
  };
}

export function promotionEvidenceFromEnvironment(environment = process.env) {
  return validatePromotionEvidence({
    candidateWorkflowRunId: environment.LOOMA_CANDIDATE_WORKFLOW_RUN_ID,
    publicKnitEvidenceSha256: environment.LOOMA_PUBLIC_KNIT_EVIDENCE_SHA256,
    publicKnitEvidenceUrl: environment.LOOMA_PUBLIC_KNIT_EVIDENCE_URL,
    hostedDocsEvidenceSha256: environment.LOOMA_HOSTED_DOCS_EVIDENCE_SHA256,
    hostedDocsEvidenceUrl: environment.LOOMA_HOSTED_DOCS_EVIDENCE_URL,
    hostedDocsUrl: environment.LOOMA_HOSTED_DOCS_URL,
    githubServerUrl: environment.GITHUB_SERVER_URL,
    githubRepository: environment.GITHUB_REPOSITORY
  });
}

export function validatePromotionEvidenceRecord(evidence) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    throw new Error("promotionEvidence must be an object");
  }
  const runUrl = httpsUrl(evidence.candidateWorkflowRunUrl, "candidateWorkflowRunUrl");
  const pathSegments = runUrl.pathname.split("/").filter(Boolean);
  if (pathSegments.length !== 5
    || pathSegments[2] !== "actions"
    || pathSegments[3] !== "runs") {
    throw new Error("candidateWorkflowRunUrl must be a canonical GitHub Actions run URL");
  }
  const validated = validatePromotionEvidence({
    ...evidence,
    githubServerUrl: runUrl.origin,
    githubRepository: pathSegments.slice(0, 2).join("/")
  });
  if (validated.candidateWorkflowRunUrl !== runUrl.href) {
    throw new Error("candidateWorkflowRunUrl does not match candidateWorkflowRunId");
  }
  return validated;
}

export function validateReleaseDispatch({
  publishCandidate,
  promoteLatest,
  ...promotionInput
}) {
  const publish = dispatchBoolean(publishCandidate, "publishCandidate");
  const promote = dispatchBoolean(promoteLatest, "promoteLatest");
  if (publish && promote) {
    throw new Error("Candidate publication and latest promotion require separate workflow dispatches");
  }
  if (promote) {
    return {
      mode: "promote-latest",
      publishCandidate: false,
      promoteLatest: true,
      promotionEvidence: validatePromotionEvidence(promotionInput)
    };
  }
  return {
    mode: publish ? "publish-candidate" : "prepare",
    publishCandidate: publish,
    promoteLatest: false,
    promotionEvidence: null
  };
}

function main() {
  const dispatch = validateReleaseDispatch({
    publishCandidate: process.env.LOOMA_PUBLISH_CANDIDATE,
    promoteLatest: process.env.LOOMA_PROMOTE_LATEST,
    candidateWorkflowRunId: process.env.LOOMA_CANDIDATE_WORKFLOW_RUN_ID,
    publicKnitEvidenceSha256: process.env.LOOMA_PUBLIC_KNIT_EVIDENCE_SHA256,
    publicKnitEvidenceUrl: process.env.LOOMA_PUBLIC_KNIT_EVIDENCE_URL,
    hostedDocsEvidenceSha256: process.env.LOOMA_HOSTED_DOCS_EVIDENCE_SHA256,
    hostedDocsEvidenceUrl: process.env.LOOMA_HOSTED_DOCS_EVIDENCE_URL,
    hostedDocsUrl: process.env.LOOMA_HOSTED_DOCS_URL,
    githubServerUrl: process.env.GITHUB_SERVER_URL,
    githubRepository: process.env.GITHUB_REPOSITORY
  });
  process.stdout.write(`${JSON.stringify(dispatch)}\n`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
