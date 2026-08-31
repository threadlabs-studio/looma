import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  applyPromotionLedgerCheckpoint,
  collectRegistryReleaseIssues,
  createPromotionLedger,
  executePromotionPlan,
  promotionOperations,
  rollbackOperations
} from "./registry-release.mjs";
import { fetchRegistryPackage } from "./verify-registry-release.mjs";
import { RELEASE_PACKAGES, RELEASE_VERSION } from "./release-config.mjs";

const releaseVersion = RELEASE_VERSION;
const packageNames = RELEASE_PACKAGES.map(({ name }) => name);
const promotionEvidence = {
  candidateWorkflowRunId: "123456789",
  candidateWorkflowRunUrl: "https://github.com/threadlabs-studio/looma/actions/runs/123456789",
  publicKnitEvidenceSha256: "a".repeat(64),
  publicKnitEvidenceUrl: "https://github.com/threadlabs-studio/knit/actions/runs/987654321/artifacts/1234",
  hostedDocsEvidenceSha256: "b".repeat(64),
  hostedDocsEvidenceUrl: "https://github.com/threadlabs-studio/looma/actions/runs/123456789/artifacts/5678",
  hostedDocsUrl: "https://threadlabs-studio.github.io/looma/"
};

function manifest() {
  return {
    schemaVersion: 1,
    releaseVersion,
    releaseEligible: true,
    sourceCommit: "a".repeat(40),
    createdAt: "2026-08-30T00:00:00.000Z",
    approvals: { npm: "npm-owner", documentation: "docs-owner", knit: "knit-owner" },
    evidence: { releaseChecklist: "docs/release-checklist.md" },
    plannedTags: { initial: "candidate", promoted: "latest" },
    packages: packageNames.map((name, publishIndex) => ({
      publishIndex,
      name,
      version: releaseVersion,
      integrity: `sha512-${name}`,
      tarball: `${name.replace(/^@/, "").replace("/", "-")}-${releaseVersion}.tgz`,
      sha256: `${publishIndex}`.repeat(64)
    }))
  };
}

function sourcePackages() {
  return Object.fromEntries(packageNames.map((name) => [name, {
    name,
    version: releaseVersion,
    license: "MIT",
    repository: { url: "git+https://github.com/threadlabs-studio/looma.git" },
    homepage: "https://github.com/threadlabs-studio/looma#readme",
    peerDependencies: { vue: "^3.5.0" },
    dependencies: {}
  }]));
}

function registryPackages() {
  return Object.fromEntries(Object.entries(sourcePackages()).map(([name, sourcePackage]) => [name, {
    ...sourcePackage,
    public: true,
    integrity: `sha512-${name}`,
    distTags: { candidate: releaseVersion },
    provenancePredicateType: "https://slsa.dev/provenance/v1"
  }]));
}

test("accepts the complete public candidate graph", () => {
  assert.deepEqual(collectRegistryReleaseIssues({
    manifest: manifest(),
    sourcePackages: sourcePackages(),
    registryPackages: registryPackages(),
    requiredTags: ["candidate"]
  }), []);
});

test("reports singleton integrity, metadata, tag, and provenance drift together", () => {
  const registry = registryPackages();
  registry["@threadlabs/looma"].integrity = "sha512-wrong";
  registry["@threadlabs/looma"].license = "Apache-2.0";
  registry["@threadlabs/looma"].distTags.candidate = "0.0.9";
  registry["@threadlabs/looma"].provenancePredicateType = null;
  registry["@threadlabs/looma"].peerDependencies.vue = ">=3";

  const issues = collectRegistryReleaseIssues({
    manifest: manifest(),
    sourcePackages: sourcePackages(),
    registryPackages: registry,
    requiredTags: ["candidate"]
  });

  for (const fragment of ["integrity", "license", "candidate", "provenance", "peer dependencies"]) {
    assert.ok(issues.some((issue) => issue.includes(fragment)), `missing ${fragment} issue`);
  }
});

test("rejects a facade package that is not publicly readable", () => {
  const registry = registryPackages();
  registry["@threadlabs/looma"].public = false;

  assert.deepEqual(collectRegistryReleaseIssues({
    manifest: manifest(),
    sourcePackages: sourcePackages(),
    registryPackages: registry,
    requiredTags: ["candidate"]
  }), ["@threadlabs/looma is not public"]);
});

test("plans singleton promotion and exact rollback for a previous latest tag", () => {
  const registry = registryPackages();
  registry["@threadlabs/looma"].distTags.latest = "0.0.9";
  const operations = promotionOperations(manifest(), registry);

  assert.deepEqual(operations.map(({ name, version, previousLatest }) => ({ name, version, previousLatest })), [
    { name: "@threadlabs/looma", version: releaseVersion, previousLatest: "0.0.9" }
  ]);
  assert.deepEqual(rollbackOperations(operations), [
    { action: "restore", name: "@threadlabs/looma", tag: "latest", version: "0.0.9" }
  ]);
});

test("does not promote packages already pointing latest at the approved version", () => {
  const registry = registryPackages();
  for (const entry of Object.values(registry)) entry.distTags.latest = releaseVersion;
  assert.deepEqual(promotionOperations(manifest(), registry), []);
});

test("creates a durable promotion ledger from the exact approved graph and prior tags", () => {
  const releaseManifest = manifest();
  const registry = registryPackages();
  registry["@threadlabs/looma"].distTags.latest = "0.0.9";
  const tagSnapshot = Object.fromEntries(packageNames.map((name) => [
    name,
    registry[name].distTags
  ]));
  const operations = promotionOperations(releaseManifest, registry);

  const ledger = createPromotionLedger({
    manifest: releaseManifest,
    manifestPath: ".release/artifacts/release-manifest.json",
    tagSnapshot,
    operations,
    promotionEvidence,
    now: "2026-08-30T01:00:00.000Z"
  });

  assert.equal(ledger.schemaVersion, 1);
  assert.equal(ledger.status, "planned");
  assert.equal(ledger.state, "promotion-planned");
  assert.equal(ledger.createdAt, "2026-08-30T01:00:00.000Z");
  assert.equal(ledger.updatedAt, ledger.createdAt);
  assert.equal(ledger.sourceCommit, releaseManifest.sourceCommit);
  assert.equal(ledger.releaseVersion, releaseVersion);
  assert.deepEqual(ledger.approvals, releaseManifest.approvals);
  assert.deepEqual(ledger.tagSnapshot, tagSnapshot);
  assert.deepEqual(ledger.plannedOperations, operations);
  assert.deepEqual(ledger.changedPackages, operations.map((operation) => operation.name));
  assert.deepEqual(ledger.promotionEvidence, promotionEvidence);
  assert.equal(ledger.promotedAt, null);
  assert.equal(ledger.releaseManifest.path, ".release/artifacts/release-manifest.json");
  assert.deepEqual(ledger.releaseManifest.packages, releaseManifest.packages);
});

test("refuses to create the initial promotion ledger without canonical prerequisite evidence", () => {
  assert.throws(
    () => createPromotionLedger({
      manifest: manifest(),
      manifestPath: ".release/artifacts/release-manifest.json",
      tagSnapshot: {},
      operations: [],
      promotionEvidence: {
        ...promotionEvidence,
        candidateWorkflowRunUrl: "https://github.com/threadlabs-studio/looma/actions/runs/987654321"
      },
      now: "2026-08-30T01:00:00.000Z"
    }),
    /candidateWorkflowRunUrl does not match candidateWorkflowRunId/
  );
});

test("checkpoints successful promotion through public registry verification", () => {
  const releaseManifest = manifest();
  const registry = registryPackages();
  const operations = promotionOperations(releaseManifest, registry);
  const base = createPromotionLedger({
    manifest: releaseManifest,
    manifestPath: ".release/artifacts/release-manifest.json",
    tagSnapshot: Object.fromEntries(packageNames.map((name) => [name, registry[name].distTags])),
    operations,
    promotionEvidence,
    now: "2026-08-30T01:00:00.000Z"
  });
  const attempted = applyPromotionLedgerCheckpoint(base, {
    type: "promotion-operation-attempted",
    operation: operations[0]
  }, "2026-08-30T01:00:01.000Z");
  const applied = applyPromotionLedgerCheckpoint(attempted, {
    type: "promotion-operation-applied",
    operation: operations[0]
  }, "2026-08-30T01:00:02.000Z");
  const verified = applyPromotionLedgerCheckpoint(applied, {
    type: "promotion-verification-succeeded",
    verification: { schemaVersion: 1, packages: packageNames }
  }, "2026-08-30T01:00:03.000Z");

  assert.equal(verified.status, "succeeded");
  assert.equal(verified.state, "registry-verified");
  assert.equal(verified.operationStates[0].status, "applied");
  assert.equal(verified.operationStates[0].attemptedAt, "2026-08-30T01:00:01.000Z");
  assert.equal(verified.operationStates[0].appliedAt, "2026-08-30T01:00:02.000Z");
  assert.equal(verified.promotedAt, "2026-08-30T01:00:03.000Z");
  assert.deepEqual(verified.verification, { schemaVersion: 1, packages: packageNames });
});

test("reads the full npm packument shape used for metadata and provenance proof", async () => {
  const entry = await fetchRegistryPackage("@threadlabs/looma", releaseVersion, async (url, options) => {
    assert.equal(url.toString(), "https://registry.npmjs.org/%40threadlabs%2Flooma");
    assert.equal(options.headers.accept, "application/json");
    return {
      ok: true,
      json: async () => ({
        "dist-tags": { candidate: releaseVersion },
        versions: {
          [releaseVersion]: {
            name: "@threadlabs/looma",
            version: releaseVersion,
            license: "MIT",
            repository: { url: "git+https://github.com/threadlabs-studio/looma.git" },
            homepage: "https://github.com/threadlabs-studio/looma#readme",
            peerDependencies: {},
            dist: {
              integrity: "sha512-core",
              attestations: { provenance: { predicateType: "https://slsa.dev/provenance/v1" } }
            }
          }
        }
      })
    };
  });

  assert.equal(entry.public, true);
  assert.equal(entry.integrity, "sha512-core");
  assert.equal(entry.provenancePredicateType, "https://slsa.dev/provenance/v1");
  assert.equal(entry.distTags.candidate, releaseVersion);
});

test("restores the singleton tag when promotion fails", async () => {
  const registry = registryPackages();
  registry["@threadlabs/looma"].distTags.latest = "0.0.9";
  const operations = promotionOperations(manifest(), registry);
  const promoted = [];
  const rolledBack = [];
  const checkpoints = [];

  await assert.rejects(
    executePromotionPlan({
      operations,
      promote: async (operation) => {
        promoted.push(operation.name);
        throw new Error("registry write became ambiguous");
      },
      verify: async () => assert.fail("verification must not run after a failed write"),
      rollback: async (operation) => rolledBack.push(operation),
      verifyRollback: async () => [],
      onCheckpoint: async (checkpoint) => checkpoints.push(checkpoint)
    }),
    /registry write became ambiguous[\s\S]*restored to the recorded snapshot/
  );
  assert.deepEqual(promoted, ["@threadlabs/looma"]);
  assert.deepEqual(rolledBack, [
    { action: "restore", name: "@threadlabs/looma", tag: "latest", version: "0.0.9" }
  ]);
  assert.deepEqual(checkpoints.map((checkpoint) => checkpoint.type), [
    "promotion-operation-attempted",
    "promotion-failed",
    "rollback-operation-attempted",
    "rollback-operation-applied",
    "rollback-verification-attempted",
    "rollback-verification-succeeded"
  ]);
});

test("does not begin a registry mutation when its attempted checkpoint cannot persist", async () => {
  const operations = promotionOperations(manifest(), registryPackages()).slice(0, 1);
  let promoted = false;

  await assert.rejects(
    executePromotionPlan({
      operations,
      promote: async () => {
        promoted = true;
      },
      verify: async () => assert.fail("verification must not run"),
      rollback: async () => assert.fail("no operation was attempted, so rollback must not run"),
      verifyRollback: async (attempted) => {
        assert.deepEqual(attempted, []);
        return [];
      },
      onCheckpoint: async ({ type }) => {
        if (type === "promotion-operation-attempted") throw new Error("evidence disk unavailable");
      }
    }),
    /evidence disk unavailable[\s\S]*restored to the recorded snapshot/
  );
  assert.equal(promoted, false);
});

test("checkpoints verification and rollback failures for manual recovery", async () => {
  const operations = promotionOperations(manifest(), registryPackages()).slice(0, 1);
  const checkpoints = [];
  let ledger = createPromotionLedger({
    manifest: manifest(),
    manifestPath: ".release/artifacts/release-manifest.json",
    tagSnapshot: { "@threadlabs/looma": { candidate: releaseVersion } },
    operations,
    promotionEvidence,
    now: "2026-08-30T01:00:00.000Z"
  });

  await assert.rejects(
    executePromotionPlan({
      operations,
      promote: async () => {},
      verify: async () => {
        throw new Error("latest verification timed out");
      },
      rollback: async () => {
        throw new Error("rollback command denied");
      },
      verifyRollback: async () => ["@threadlabs/looma: latest did not return to the recorded snapshot"],
      onCheckpoint: async (checkpoint) => {
        checkpoints.push(checkpoint);
        ledger = applyPromotionLedgerCheckpoint(
          ledger,
          checkpoint,
          `2026-08-30T01:00:${String(checkpoints.length).padStart(2, "0")}.000Z`
        );
      }
    }),
    /latest verification timed out[\s\S]*Rollback failures require owner intervention/
  );

  assert.deepEqual(checkpoints.map((checkpoint) => checkpoint.type), [
    "promotion-operation-attempted",
    "promotion-operation-applied",
    "promotion-verification-attempted",
    "promotion-verification-failed",
    "promotion-failed",
    "rollback-operation-attempted",
    "rollback-operation-failed",
    "rollback-verification-attempted",
    "rollback-verification-failed"
  ]);
  assert.equal(ledger.status, "rollback-failed");
  assert.equal(ledger.state, "manual-recovery-required");
  assert.equal(ledger.operationStates[0].status, "applied");
  assert.equal(ledger.rollback.operations[0].status, "failed");
  assert.deepEqual(ledger.rollback.verification.failures, [
    "@threadlabs/looma: latest did not return to the recorded snapshot"
  ]);
});

test("wires candidate verification and protected promotion without weakening publication policy", async () => {
  const [rootPackage, workflow, checklist] = await Promise.all([
    readFile(new URL("../../package.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../.github/workflows/release.yml", import.meta.url), "utf8"),
    readFile(new URL("../../docs/release-checklist.md", import.meta.url), "utf8")
  ]);

  assert.equal(rootPackage.scripts["release:verify-registry"], "node tools/scripts/verify-registry-release.mjs");
  assert.equal(rootPackage.scripts["release:promote"], "node tools/scripts/promote-release.mjs");
  assert.match(workflow, /verify-registry-release\.mjs --tag candidate/);
  assert.match(workflow, /promote-release\.mjs --execute/);
  assert.match(workflow, /LOOMA_RELEASE_PROMOTE: approved/);
  assert.match(checklist, /npm publish.*allowed action/i);
  assert.match(checklist, /npm commands other than publish\s+require traditional authentication/i);
});
