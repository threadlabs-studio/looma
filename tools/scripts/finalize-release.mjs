import { createHash } from "node:crypto";
import { appendFile, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import { sha256File } from "./create-release-manifest.mjs";
import { RELEASE_PACKAGE_NAMES, RELEASE_PACKAGES, RELEASE_VERSION } from "./release-config.mjs";
import { validatePromotionEvidenceRecord } from "./release-dispatch.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");
const manifestRelativePath = ".release/artifacts/release-manifest.json";
const ledgerRelativePath = ".release/evidence/registry-promotion.json";
const assetPaths = [manifestRelativePath, ledgerRelativePath];
const canonicalRepository = "threadlabs-studio/looma";
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function requireString(value, message) {
  requireCondition(typeof value === "string" && value.trim().length > 0, message);
  return value;
}

function requireSha256(value, message) {
  requireCondition(typeof value === "string" && SHA256_PATTERN.test(value), message);
  return value;
}

function requireHttpsUrl(value, message) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(message);
  }
  requireCondition(
    url.protocol === "https:" && url.hostname && !url.username && !url.password,
    message
  );
  return url.href;
}

function candidateNotes(changelog) {
  const escapedVersion = RELEASE_VERSION.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const heading = new RegExp(`^## v${escapedVersion} Candidate\\s*$`, "m").exec(changelog);
  requireCondition(heading, `CHANGELOG.md must contain v${RELEASE_VERSION} Candidate notes`);
  const remainder = changelog.slice(heading.index + heading[0].length);
  const nextHeading = remainder.search(/^##\s/m);
  const notes = (nextHeading >= 0 ? remainder.slice(0, nextHeading) : remainder).trim();
  requireCondition(notes, `CHANGELOG.md must contain non-empty v${RELEASE_VERSION} Candidate notes`);
  return notes;
}

function validateManifest(manifestValue) {
  const manifest = object(manifestValue);
  requireCondition(manifest.schemaVersion === 1, "release manifest schemaVersion must be 1");
  requireCondition(
    manifest.releaseVersion === RELEASE_VERSION,
    `release manifest version must be ${RELEASE_VERSION}`
  );
  requireCondition(COMMIT_PATTERN.test(manifest.sourceCommit ?? ""), "release manifest sourceCommit is invalid");
  requireCondition(manifest.releaseEligible === true, "release manifest must be release eligible");
  requireCondition(
    Array.isArray(manifest.exceptions) && manifest.exceptions.length === 0,
    "release manifest must not contain release exceptions"
  );
  requireCondition(
    isDeepStrictEqual(manifest.plannedTags, { initial: "candidate", promoted: "latest" }),
    "release manifest must preserve the Candidate then latest tag separation"
  );

  const expectedNames = RELEASE_PACKAGES.map((entry) => entry.name);
  const packages = Array.isArray(manifest.packages) ? manifest.packages : [];
  requireCondition(
    isDeepStrictEqual(packages.map((entry) => entry?.name), expectedNames),
    "release manifest does not contain the exact approved package set in dependency order"
  );
  for (const [index, releasePackage] of packages.entries()) {
    requireCondition(releasePackage.publishIndex === index, `${releasePackage.name} publish index is invalid`);
    requireCondition(releasePackage.version === RELEASE_VERSION, `${releasePackage.name} version is invalid`);
    requireString(releasePackage.tarball, `${releasePackage.name} tarball path is missing`);
    requireSha256(releasePackage.sha256, `${releasePackage.name} tarball SHA-256 is invalid`);
    requireCondition(
      Number.isSafeInteger(releasePackage.bytes) && releasePackage.bytes > 0,
      `${releasePackage.name} tarball byte count is invalid`
    );
    requireCondition(
      Array.isArray(releasePackage.files) && releasePackage.files.length > 0,
      `${releasePackage.name} packed file inventory is missing`
    );
    const internalDependencies = Array.isArray(releasePackage.internalDependencies)
      ? releasePackage.internalDependencies
      : [];
    for (const dependencyName of internalDependencies) {
      const dependencyIndex = expectedNames.indexOf(dependencyName);
      requireCondition(
        dependencyIndex >= 0 && dependencyIndex < index,
        `${releasePackage.name} dependency ${dependencyName} is missing or not dependency-first`
      );
    }
  }

  const approvals = object(manifest.approvals);
  for (const owner of ["npm", "documentation", "knit"]) {
    requireString(approvals[owner], `release manifest ${owner} approval owner is missing`);
  }
  return manifest;
}

function validatePromotionLedger(ledgerValue, manifest) {
  const ledger = object(ledgerValue);
  requireCondition(ledger.schemaVersion === 1, "promotion ledger schemaVersion must be 1");
  requireCondition(
    ledger.evidenceType === "registry-promotion-ledger",
    "promotion ledger evidenceType is invalid"
  );
  requireCondition(
    ledger.status === "succeeded" && ledger.state === "registry-verified",
    "release record requires a successful latest promotion"
  );
  requireCondition(ledger.sourceCommit === manifest.sourceCommit, "promotion ledger source commit does not match manifest");
  requireCondition(ledger.releaseVersion === manifest.releaseVersion, "promotion ledger version does not match manifest");
  requireCondition(isDeepStrictEqual(ledger.approvals, manifest.approvals), "promotion ledger approvals do not match manifest");

  const embeddedManifest = object(ledger.releaseManifest);
  requireCondition(
    embeddedManifest.path === manifestRelativePath,
    `promotion ledger must bind ${manifestRelativePath}`
  );
  const embeddedPackages = Array.isArray(embeddedManifest.packages)
    ? embeddedManifest.packages
    : [];
  const manifestPackageProjection = embeddedPackages.map((entry) => {
    const { integrity: _derivedIntegrity, ...manifestPackage } = object(entry);
    return manifestPackage;
  });
  requireCondition(
    embeddedManifest.schemaVersion === manifest.schemaVersion
      && isDeepStrictEqual(embeddedManifest.evidence, manifest.evidence)
      && isDeepStrictEqual(manifestPackageProjection, manifest.packages),
    "promotion ledger does not bind the exact manifest package graph"
  );

  const promotionEvidence = object(ledger.promotionEvidence);
  requireSha256(
    promotionEvidence.publicKnitEvidenceSha256,
    "promotion ledger public Knit evidence SHA-256 is missing or invalid"
  );
  requireHttpsUrl(
    promotionEvidence.publicKnitEvidenceUrl,
    "promotion ledger public Knit evidence URL is missing or invalid"
  );
  requireSha256(
    promotionEvidence.hostedDocsEvidenceSha256,
    "promotion ledger hosted docs evidence SHA-256 is missing or invalid"
  );
  requireHttpsUrl(
    promotionEvidence.hostedDocsEvidenceUrl,
    "promotion ledger hosted docs evidence URL is missing or invalid"
  );
  requireHttpsUrl(
    promotionEvidence.hostedDocsUrl,
    "promotion ledger hosted docs URL is missing or invalid"
  );
  const validatedEvidence = validatePromotionEvidenceRecord(promotionEvidence);
  requireCondition(
    manifest.evidence?.workflowRun === validatedEvidence.candidateWorkflowRunUrl,
    "promotion ledger Candidate run URL does not match the exact manifest workflow run"
  );

  const verification = object(ledger.verification);
  requireCondition(
    verification.sourceCommit === manifest.sourceCommit
      && verification.releaseVersion === RELEASE_VERSION,
    "promotion registry verification does not match the manifest source and version"
  );
  requireCondition(
    isDeepStrictEqual(verification.requiredTags, ["candidate", "latest"]),
    "promotion registry verification must prove candidate and latest tags"
  );
  const verificationPackages = Array.isArray(verification.packages) ? verification.packages : [];
  requireCondition(
    isDeepStrictEqual(
      verificationPackages.map((entry) => entry?.name),
      manifest.packages.map((entry) => entry.name)
    ),
    "promotion registry verification does not contain the exact approved package graph"
  );
  for (const [index, entry] of verificationPackages.entries()) {
    const approvedIntegrity = requireString(
      embeddedPackages[index]?.integrity,
      `${entry.name} approved artifact integrity is missing`
    );
    requireCondition(entry.version === RELEASE_VERSION, `${entry.name} registry verification version is invalid`);
    requireString(entry.integrity, `${entry.name} registry integrity evidence is missing`);
    requireCondition(
      entry.integrity === approvedIntegrity,
      `${entry.name} registry integrity does not match the approved artifact`
    );
    requireCondition(
      entry.distTags?.candidate === RELEASE_VERSION && entry.distTags?.latest === RELEASE_VERSION,
      `${entry.name} registry verification must prove candidate and latest at ${RELEASE_VERSION}`
    );
    requireCondition(
      entry.provenancePredicateType === "https://slsa.dev/provenance/v1",
      `${entry.name} registry provenance evidence is invalid`
    );
  }
  requireCondition(
    Array.isArray(ledger.plannedOperations)
      && Array.isArray(ledger.changedPackages)
      && Array.isArray(ledger.operationStates),
    "promotion ledger operation records are missing"
  );
  const plannedOperations = ledger.plannedOperations;
  const changedPackages = ledger.changedPackages;
  const operationStates = ledger.operationStates;
  const operationIdentity = (operation) => ({
    name: operation?.name,
    version: operation?.version,
    tag: operation?.tag,
    previousLatest: operation?.previousLatest ?? null
  });
  requireCondition(
    new Set(plannedOperations.map((operation) => operation?.name)).size === plannedOperations.length,
    "promotion ledger contains duplicate planned operations"
  );
  requireCondition(
    isDeepStrictEqual(changedPackages, plannedOperations.map((operation) => operation?.name))
      && isDeepStrictEqual(operationStates.map(operationIdentity), plannedOperations.map(operationIdentity)),
    "promotion ledger planned operations, changed packages, and operation states do not match"
  );
  for (const operation of operationStates) {
    requireCondition(
      RELEASE_PACKAGE_NAMES.has(operation.name)
        && operation.version === RELEASE_VERSION
        && operation.tag === "latest"
        && operation.status === "applied",
      "promotion ledger contains an incomplete or invalid latest operation"
    );
  }
  return ledger;
}

export function validateReleaseRecord({
  manifest: manifestValue,
  ledger: ledgerValue,
  headCommit,
  changelog,
  assetHashes = {}
}) {
  const manifest = validateManifest(manifestValue);
  requireCondition(
    manifest.sourceCommit === headCommit,
    "release manifest source commit does not match checked-out HEAD"
  );
  validatePromotionLedger(ledgerValue, manifest);
  for (const assetPath of assetPaths) {
    requireSha256(assetHashes[assetPath], `${assetPath} exact-byte SHA-256 is missing or invalid`);
  }
  const tag = `v${manifest.releaseVersion}`;
  return {
    tag,
    title: `Looma ${tag} Candidate`,
    notes: candidateNotes(changelog),
    sourceCommit: manifest.sourceCommit,
    assetPaths: [...assetPaths],
    assetHashes: structuredClone(assetHashes)
  };
}

export function planReleaseRecord({ record, tagRef, release, assets = {}, assetNames }) {
  if (tagRef) {
    requireCondition(
      tagRef.object?.type === "commit" && tagRef.object?.sha === record.sourceCommit,
      `existing tag ref ${record.tag} does not point to the exact source commit as a lightweight tag`
    );
  }
  requireCondition(tagRef || !release, `existing release ${record.tag} has no matching tag ref`);
  if (release) {
    requireCondition(
      release.tag_name === record.tag
        && release.name === record.title
        && release.body === record.notes
        && release.draft === false
        && release.prerelease === true,
      `existing release ${record.tag} does not match the approved Candidate release record`
    );
    requireCondition(Array.isArray(assetNames), "existing release asset inventory is missing");
    const approvedAssetNames = new Set(record.assetPaths.map((assetPath) => path.basename(assetPath)));
    requireCondition(
      assetNames.every((assetName) => approvedAssetNames.has(assetName)),
      `existing release ${record.tag} contains an unexpected asset`
    );
  }

  const uploadAssets = [];
  for (const assetPath of record.assetPaths) {
    const existingHash = assets[assetPath];
    if (existingHash === undefined) {
      uploadAssets.push(assetPath);
    } else {
      requireCondition(
        existingHash === record.assetHashes[assetPath],
        `existing release asset ${path.basename(assetPath)} does not match the exact approved bytes`
      );
    }
  }
  requireCondition(release || Object.keys(assets).length === 0, "release assets exist without a release record");
  return {
    createTag: !tagRef,
    createRelease: !release,
    uploadAssets
  };
}

export function validateExecutionGuard({ execute, approval }) {
  if (execute) {
    requireCondition(
      approval === "approved",
      "execution requires LOOMA_RELEASE_RECORD=approved from the protected post-promotion job"
    );
  }
}

function run(command, args, { allowNotFound = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env
  });
  if (result.status !== 0) {
    if (allowNotFound && /HTTP 404|not found/i.test(result.stderr ?? "")) return null;
    throw new Error(`${command} ${args.join(" ")} failed\n${result.stderr ?? ""}`);
  }
  return result.stdout.trim();
}

function ghApi(endpoint, { allowNotFound = false, method, fields = [] } = {}) {
  const args = ["api", endpoint];
  if (method) args.push("--method", method);
  for (const [name, value] of fields) args.push("-f", `${name}=${value}`);
  const output = run("gh", args, { allowNotFound });
  return output === null ? null : JSON.parse(output);
}

async function inspectRemoteRelease(record, repository) {
  const tagRef = ghApi(`repos/${repository}/git/ref/tags/${record.tag}`, { allowNotFound: true });
  const release = ghApi(`repos/${repository}/releases/tags/${record.tag}`, { allowNotFound: true });
  const assets = {};
  const assetNames = [];
  if (release) {
    const byName = new Map((release.assets ?? []).map((entry) => [entry.name, entry]));
    assetNames.push(...byName.keys());
    const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "looma-release-record-"));
    try {
      for (const assetPath of record.assetPaths) {
        const assetName = path.basename(assetPath);
        if (!byName.has(assetName)) continue;
        run("gh", [
          "release", "download", record.tag,
          "--repo", repository,
          "--pattern", assetName,
          "--dir", temporaryDirectory
        ]);
        assets[assetPath] = await sha256File(path.join(temporaryDirectory, assetName));
      }
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }
  return { tagRef, release, assets, assetNames };
}

function executeReleaseRecord(record, plan, repository) {
  if (plan.createTag) {
    ghApi(`repos/${repository}/git/refs`, {
      method: "POST",
      fields: [
        ["ref", `refs/tags/${record.tag}`],
        ["sha", record.sourceCommit]
      ]
    });
  }
  if (plan.createRelease) {
    run("gh", [
      "release", "create", record.tag,
      "--repo", repository,
      "--verify-tag",
      "--title", record.title,
      "--notes", record.notes,
      "--prerelease"
    ]);
  }
  for (const assetPath of plan.uploadAssets) {
    run("gh", ["release", "upload", record.tag, assetPath, "--repo", repository]);
  }
}

async function writeReleaseOutput(releaseUrl) {
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `release_url=${releaseUrl}\n`, "utf8");
  }
}

async function main() {
  const argumentsList = process.argv.slice(2);
  requireCondition(
    argumentsList.length === 0
      || (argumentsList.length === 1 && argumentsList[0] === "--execute"),
    "the only supported argument is --execute"
  );
  const execute = argumentsList.length === 1;
  const repository = process.env.GITHUB_REPOSITORY || canonicalRepository;
  requireCondition(REPOSITORY_PATTERN.test(repository), "GITHUB_REPOSITORY must be an owner/repository pair");
  requireCondition(
    repository === canonicalRepository,
    `release record repository must be ${canonicalRepository}`
  );

  const manifestPath = path.join(repoRoot, manifestRelativePath);
  const ledgerPath = path.join(repoRoot, ledgerRelativePath);
  const [manifestBytes, ledgerBytes, changelog, headCommit] = await Promise.all([
    readFile(manifestPath),
    readFile(ledgerPath),
    readFile(path.join(repoRoot, "CHANGELOG.md"), "utf8"),
    Promise.resolve(run("git", ["rev-parse", "HEAD"]))
  ]);
  const record = validateReleaseRecord({
    manifest: JSON.parse(manifestBytes.toString("utf8")),
    ledger: JSON.parse(ledgerBytes.toString("utf8")),
    headCommit,
    changelog,
    assetHashes: {
      [manifestRelativePath]: createHash("sha256").update(manifestBytes).digest("hex"),
      [ledgerRelativePath]: createHash("sha256").update(ledgerBytes).digest("hex")
    }
  });
  const remote = await inspectRemoteRelease(record, repository);
  const plan = planReleaseRecord({ record, ...remote });
  const releaseUrl = `https://github.com/${repository}/releases/tag/${record.tag}`;

  if (!execute) {
    process.stdout.write(`${JSON.stringify({ tag: record.tag, releaseUrl, ...plan }, null, 2)}\n`);
    await writeReleaseOutput(releaseUrl);
    return;
  }
  validateExecutionGuard({ execute, approval: process.env.LOOMA_RELEASE_RECORD });
  executeReleaseRecord(record, plan, repository);
  const completedPlan = planReleaseRecord({
    record,
    ...(await inspectRemoteRelease(record, repository))
  });
  requireCondition(
    !completedPlan.createTag
      && !completedPlan.createRelease
      && completedPlan.uploadAssets.length === 0,
    "release record did not reach an exact idempotent state"
  );
  await writeReleaseOutput(releaseUrl);
  process.stdout.write(`Recorded ${record.tag} at ${releaseUrl}\n`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
