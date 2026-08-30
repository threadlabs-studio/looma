import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  collectRegistryReleaseIssues,
  executePromotionPlan,
  promotionOperations,
  rollbackOperations
} from "./registry-release.mjs";
import { fetchRegistryPackage } from "./verify-registry-release.mjs";

const releaseVersion = "0.1.0";
const packageNames = ["@looma/tokens", "@looma/layout", "@looma/core", "@looma/editor", "@looma/vue"];

function manifest() {
  return {
    schemaVersion: 1,
    releaseVersion,
    releaseEligible: true,
    sourceCommit: "a".repeat(40),
    plannedTags: { initial: "candidate", promoted: "latest" },
    packages: packageNames.map((name, publishIndex) => ({
      publishIndex,
      name,
      version: releaseVersion,
      integrity: `sha512-${name}`
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
    peerDependencies: name === "@looma/vue" ? { vue: "^3.5.0" } : {},
    dependencies: name === "@looma/editor"
      ? { "@looma/core": "workspace:*", "@looma/tokens": "workspace:*" }
      : name === "@looma/vue"
        ? { "@looma/core": "workspace:*", "@looma/editor": "workspace:*", "@looma/layout": "workspace:*" }
        : {}
  }]));
}

function registryPackages() {
  return Object.fromEntries(packageNames.map((name) => [name, {
    name,
    version: releaseVersion,
    public: true,
    integrity: `sha512-${name}`,
    license: "MIT",
    repository: { url: "git+https://github.com/threadlabs-studio/looma.git" },
    homepage: "https://github.com/threadlabs-studio/looma#readme",
    peerDependencies: name === "@looma/vue" ? { vue: "^3.5.0" } : {},
    dependencies: name === "@looma/editor"
      ? { "@looma/core": releaseVersion, "@looma/tokens": releaseVersion }
      : name === "@looma/vue"
        ? { "@looma/core": releaseVersion, "@looma/editor": releaseVersion, "@looma/layout": releaseVersion }
        : {},
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

test("reports integrity, metadata, dependency, tag, access, and provenance drift together", () => {
  const registry = registryPackages();
  registry["@looma/editor"].integrity = "sha512-wrong";
  registry["@looma/editor"].license = "Apache-2.0";
  registry["@looma/editor"].dependencies["@looma/core"] = "^0.1.0";
  registry["@looma/editor"].distTags.candidate = "0.0.9";
  registry["@looma/tokens"].public = false;
  registry["@looma/editor"].provenancePredicateType = null;
  registry["@looma/vue"].peerDependencies.vue = ">=3";

  const issues = collectRegistryReleaseIssues({
    manifest: manifest(),
    sourcePackages: sourcePackages(),
    registryPackages: registry,
    requiredTags: ["candidate"]
  });

  for (const fragment of ["integrity", "license", "@looma/core", "candidate", "public", "provenance", "peer dependencies"]) {
    assert.ok(issues.some((issue) => issue.includes(fragment)), `missing ${fragment} issue`);
  }
});

test("plans dependency-order promotion and exact rollback for absent or previous latest tags", () => {
  const registry = registryPackages();
  registry["@looma/layout"].distTags.latest = "0.0.9";
  const operations = promotionOperations(manifest(), registry);

  assert.deepEqual(operations.map(({ name, version, previousLatest }) => ({ name, version, previousLatest })), [
    { name: "@looma/tokens", version: releaseVersion, previousLatest: null },
    { name: "@looma/layout", version: releaseVersion, previousLatest: "0.0.9" },
    { name: "@looma/core", version: releaseVersion, previousLatest: null },
    { name: "@looma/editor", version: releaseVersion, previousLatest: null },
    { name: "@looma/vue", version: releaseVersion, previousLatest: null }
  ]);
  assert.deepEqual(rollbackOperations(operations.slice(0, 2)), [
    { action: "restore", name: "@looma/layout", tag: "latest", version: "0.0.9" },
    { action: "remove", name: "@looma/tokens", tag: "latest" }
  ]);
});

test("does not promote packages already pointing latest at the approved version", () => {
  const registry = registryPackages();
  for (const entry of Object.values(registry)) entry.distTags.latest = releaseVersion;
  assert.deepEqual(promotionOperations(manifest(), registry), []);
});

test("reads the full npm packument shape used for metadata and provenance proof", async () => {
  const entry = await fetchRegistryPackage("@looma/core", releaseVersion, async (url, options) => {
    assert.equal(url.toString(), "https://registry.npmjs.org/%40looma%2Fcore");
    assert.equal(options.headers.accept, "application/json");
    return {
      ok: true,
      json: async () => ({
        "dist-tags": { candidate: releaseVersion },
        versions: {
          [releaseVersion]: {
            name: "@looma/core",
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

test("restores every attempted tag when promotion fails partway through", async () => {
  const registry = registryPackages();
  registry["@looma/layout"].distTags.latest = "0.0.9";
  const operations = promotionOperations(manifest(), registry).slice(0, 3);
  const promoted = [];
  const rolledBack = [];

  await assert.rejects(
    executePromotionPlan({
      operations,
      promote: async (operation) => {
        promoted.push(operation.name);
        if (operation.name === "@looma/layout") throw new Error("registry write became ambiguous");
      },
      verify: async () => assert.fail("verification must not run after a failed write"),
      rollback: async (operation) => rolledBack.push(operation),
      verifyRollback: async () => []
    }),
    /registry write became ambiguous[\s\S]*restored to the recorded snapshot/
  );
  assert.deepEqual(promoted, ["@looma/tokens", "@looma/layout"]);
  assert.deepEqual(rolledBack, [
    { action: "restore", name: "@looma/layout", tag: "latest", version: "0.0.9" },
    { action: "remove", name: "@looma/tokens", tag: "latest" }
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
