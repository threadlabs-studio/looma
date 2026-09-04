import assert from "node:assert/strict";
import test from "node:test";

import { RELEASE_PACKAGES } from "./release-config.mjs";

const finalizer = await import("./finalize-release.mjs").catch((importError) => ({ importError }));

const sourceCommit = "a".repeat(40);
const packageNames = RELEASE_PACKAGES.map(({ name }) => name);

function manifest() {
  return {
    schemaVersion: 1,
    releaseVersion: "0.1.7",
    sourceCommit,
    releaseEligible: true,
    exceptions: [],
    approvals: { npm: "npm-owner", documentation: "docs-owner", knit: "knit-owner" },
    evidence: { workflowRun: "https://github.com/threadlabs-studio/looma/actions/runs/123" },
    plannedTags: { initial: "candidate", promoted: "latest" },
    packages: packageNames.map((name, publishIndex) => ({
      publishIndex,
      name,
      version: "0.1.7",
      tarball: `${name.split("/")[1]}-0.1.7.tgz`,
      sha256: String(publishIndex).repeat(64),
      bytes: 100 + publishIndex,
      files: ["package/package.json"]
    }))
  };
}

function ledger(releaseManifest = manifest()) {
  return {
    schemaVersion: 1,
    evidenceType: "registry-promotion-ledger",
    status: "succeeded",
    state: "registry-verified",
    sourceCommit,
    releaseVersion: "0.1.7",
    approvals: structuredClone(releaseManifest.approvals),
    promotionEvidence: {
      candidateWorkflowRunId: "123",
      candidateWorkflowRunUrl: "https://github.com/threadlabs-studio/looma/actions/runs/123",
      publicKnitEvidenceSha256: "b".repeat(64),
      publicKnitEvidenceUrl: "https://github.com/threadlabs-studio/knit/actions/runs/456/artifacts/1",
      hostedDocsEvidenceSha256: "c".repeat(64),
      hostedDocsEvidenceUrl: "https://github.com/threadlabs-studio/looma/actions/runs/789/artifacts/2",
      hostedDocsUrl: "https://threadlabs-studio.github.io/looma/"
    },
    releaseManifest: {
      path: ".release/artifacts/release-manifest.json",
      schemaVersion: releaseManifest.schemaVersion,
      evidence: structuredClone(releaseManifest.evidence),
      packages: releaseManifest.packages.map((entry) => ({
        ...structuredClone(entry),
        integrity: `sha512-${entry.publishIndex}`
      }))
    },
    plannedOperations: releaseManifest.packages.map((entry) => ({
      name: entry.name,
      version: entry.version,
      tag: "latest",
      previousLatest: null
    })),
    changedPackages: releaseManifest.packages.map((entry) => entry.name),
    operationStates: releaseManifest.packages.map((entry) => ({
      name: entry.name,
      version: entry.version,
      tag: "latest",
      previousLatest: null,
      status: "applied"
    })),
    verification: {
      schemaVersion: 1,
      sourceCommit,
      releaseVersion: "0.1.7",
      requiredTags: ["candidate", "latest"],
      packages: releaseManifest.packages.map((entry) => ({
        name: entry.name,
        version: entry.version,
        integrity: `sha512-${entry.publishIndex}`,
        distTags: { candidate: "0.1.7", latest: "0.1.7" },
        provenancePredicateType: "https://slsa.dev/provenance/v1"
      }))
    }
  };
}

const changelog = `# Changelog\n\n## v0.1.7 Candidate\n\nRelease notes.\n\nSupport boundary.\n\n## v0.0.9\n\nOlder notes.\n`;
const assetHashes = {
  ".release/artifacts/release-manifest.json": "d".repeat(64),
  ".release/evidence/registry-promotion.json": "e".repeat(64)
};

test("finalizer module exists and exports release validation and planning", () => {
  assert.equal(finalizer.importError, undefined);
  assert.equal(typeof finalizer.validateReleaseRecord, "function");
  assert.equal(typeof finalizer.planReleaseRecord, "function");
  assert.equal(typeof finalizer.releaseCreationArguments, "function");
  assert.equal(typeof finalizer.validateExecutionGuard, "function");
});

test("creates a missing exact tag through the release API with evidence attached", () => {
  const record = {
    tag: "v0.1.7",
    title: "Looma v0.1.7 Candidate",
    notes: "Release notes.",
    sourceCommit,
    assetPaths: Object.keys(assetHashes)
  };

  assert.deepEqual(finalizer.releaseCreationArguments(record, "threadlabs-studio/looma", {
    createTag: true,
    uploadAssets: record.assetPaths
  }), [
    "release", "create", record.tag,
    ...record.assetPaths,
    "--repo", "threadlabs-studio/looma",
    "--target", sourceCommit,
    "--title", record.title,
    "--notes", record.notes,
    "--prerelease"
  ]);
});

test("requires the protected execute guard only for mutation mode", () => {
  assert.doesNotThrow(() => finalizer.validateExecutionGuard({ execute: false }));
  assert.throws(
    () => finalizer.validateExecutionGuard({ execute: true, approval: "" }),
    /LOOMA_RELEASE_RECORD=approved/
  );
  assert.doesNotThrow(() => finalizer.validateExecutionGuard({
    execute: true,
    approval: "approved"
  }));
});

test("validates one exact promoted graph and derives the immutable tag", () => {
  const record = finalizer.validateReleaseRecord({
    manifest: manifest(),
    ledger: ledger(),
    headCommit: sourceCommit,
    changelog,
    assetHashes
  });
  assert.equal(record.tag, "v0.1.7");
  assert.equal(record.title, "Looma v0.1.7 Candidate");
  assert.equal(record.sourceCommit, sourceCommit);
  assert.equal(record.notes, "Release notes.\n\nSupport boundary.");
  assert.deepEqual(record.assetPaths, [
    ".release/artifacts/release-manifest.json",
    ".release/evidence/registry-promotion.json"
  ]);
});

test("fails closed before release planning on source, graph, evidence, or promotion drift", () => {
  assert.throws(
    () => finalizer.validateReleaseRecord({
      manifest: manifest(), ledger: ledger(), headCommit: "d".repeat(40), changelog, assetHashes
    }),
    /source commit.*checked-out HEAD/i
  );

  const incomplete = manifest();
  incomplete.packages.pop();
  assert.throws(
    () => finalizer.validateReleaseRecord({
      manifest: incomplete, ledger: ledger(incomplete), headCommit: sourceCommit, changelog, assetHashes
    }),
    /exact approved package set/i
  );

  const failedPromotion = ledger();
  failedPromotion.status = "rolled-back";
  failedPromotion.state = "tag-snapshot-restored";
  assert.throws(
    () => finalizer.validateReleaseRecord({
      manifest: manifest(), ledger: failedPromotion, headCommit: sourceCommit, changelog, assetHashes
    }),
    /successful latest promotion/i
  );

  const missingKnitEvidence = ledger();
  delete missingKnitEvidence.promotionEvidence.publicKnitEvidenceSha256;
  assert.throws(
    () => finalizer.validateReleaseRecord({
      manifest: manifest(), ledger: missingKnitEvidence, headCommit: sourceCommit, changelog, assetHashes
    }),
    /public Knit evidence/i
  );

  const byteDrift = ledger();
  byteDrift.releaseManifest.packages[0].sha256 = "f".repeat(64);
  assert.throws(
    () => finalizer.validateReleaseRecord({
      manifest: manifest(), ledger: byteDrift, headCommit: sourceCommit, changelog, assetHashes
    }),
    /exact manifest package graph/i
  );

  const integrityDrift = ledger();
  integrityDrift.verification.packages[0].integrity = "sha512-wrong";
  assert.throws(
    () => finalizer.validateReleaseRecord({
      manifest: manifest(), ledger: integrityDrift, headCommit: sourceCommit, changelog, assetHashes
    }),
    /integrity does not match the approved artifact/i
  );

  const incompleteOperations = ledger();
  incompleteOperations.operationStates.pop();
  assert.throws(
    () => finalizer.validateReleaseRecord({
      manifest: manifest(), ledger: incompleteOperations, headCommit: sourceCommit, changelog, assetHashes
    }),
    /planned operations, changed packages, and operation states do not match/i
  );
});

test("plans creation or an exact resume and rejects mismatched remote state", () => {
  const record = finalizer.validateReleaseRecord({
    manifest: manifest(), ledger: ledger(), headCommit: sourceCommit, changelog, assetHashes
  });
  assert.deepEqual(
    finalizer.planReleaseRecord({ record, tagRef: null, release: null, assets: {}, assetNames: [] }),
    { createTag: true, createRelease: true, uploadAssets: record.assetPaths }
  );

  const exactRelease = {
    tag_name: record.tag,
    name: record.title,
    body: record.notes,
    draft: false,
    prerelease: true
  };
  assert.deepEqual(
    finalizer.planReleaseRecord({
      record,
      tagRef: { object: { type: "commit", sha: sourceCommit } },
      release: exactRelease,
      assets: Object.fromEntries(record.assetPaths.map((assetPath) => [assetPath, record.assetHashes[assetPath]])),
      assetNames: record.assetPaths.map((assetPath) => assetPath.split("/").at(-1))
    }),
    { createTag: false, createRelease: false, uploadAssets: [] }
  );

  assert.throws(
    () => finalizer.planReleaseRecord({
      record,
      tagRef: { object: { type: "commit", sha: "e".repeat(40) } },
      release: null,
      assets: {}
    }),
    /tag ref.*does not point to/i
  );
  assert.throws(
    () => finalizer.planReleaseRecord({
      record,
      tagRef: { object: { type: "commit", sha: sourceCommit } },
      release: { ...exactRelease, name: "Wrong release" },
      assets: {},
      assetNames: []
    }),
    /release.*does not match/i
  );
  assert.throws(
    () => finalizer.planReleaseRecord({
      record,
      tagRef: { object: { type: "commit", sha: sourceCommit } },
      release: exactRelease,
      assets: { [record.assetPaths[0]]: "f".repeat(64) },
      assetNames: [record.assetPaths[0].split("/").at(-1)]
    }),
    /release asset.*does not match/i
  );
  assert.throws(
    () => finalizer.planReleaseRecord({
      record,
      tagRef: { object: { type: "commit", sha: sourceCommit } },
      release: exactRelease,
      assets: Object.fromEntries(record.assetPaths.map((assetPath) => [assetPath, record.assetHashes[assetPath]])),
      assetNames: [...record.assetPaths.map((assetPath) => assetPath.split("/").at(-1)), "unapproved.txt"]
    }),
    /unexpected asset/i
  );
});

test("accepts a fully verified no-op promotion ledger", () => {
  const noOpLedger = ledger();
  noOpLedger.plannedOperations = [];
  noOpLedger.changedPackages = [];
  noOpLedger.operationStates = [];

  assert.doesNotThrow(() => finalizer.validateReleaseRecord({
    manifest: manifest(),
    ledger: noOpLedger,
    headCommit: sourceCommit,
    changelog,
    assetHashes
  }));
});
