import assert from "node:assert/strict";
import test from "node:test";

import { collectRegistryReleaseIssues } from "./registry-release.mjs";
import { fetchRegistryPackage } from "./verify-registry-release.mjs";
import { RELEASE_PACKAGES, RELEASE_VERSION } from "./release-config.mjs";

const releaseVersion = RELEASE_VERSION;
const packageNames = RELEASE_PACKAGES.map(({ name }) => name);


function manifest() {
  return {
    schemaVersion: 1,
    releaseVersion,
    releaseEligible: true,
    sourceCommit: "a".repeat(40),
    createdAt: "2026-08-30T00:00:00.000Z",
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
    distTags: { latest: releaseVersion },
    provenancePredicateType: "https://slsa.dev/provenance/v1"
  }]));
}

test("accepts the complete public release graph", () => {
  assert.deepEqual(collectRegistryReleaseIssues({
    manifest: manifest(),
    sourcePackages: sourcePackages(),
    registryPackages: registryPackages(),
    requiredTags: ["latest"]
  }), []);
});

test("reports singleton integrity, metadata, tag, and provenance drift together", () => {
  const registry = registryPackages();
  registry["@threadlabs/looma"].integrity = "sha512-wrong";
  registry["@threadlabs/looma"].license = "Apache-2.0";
  registry["@threadlabs/looma"].distTags.latest = "0.0.9";
  registry["@threadlabs/looma"].provenancePredicateType = null;
  registry["@threadlabs/looma"].peerDependencies.vue = ">=3";

  const issues = collectRegistryReleaseIssues({
    manifest: manifest(),
    sourcePackages: sourcePackages(),
    registryPackages: registry,
    requiredTags: ["latest"]
  });

  for (const fragment of ["integrity", "license", "latest", "provenance", "peer dependencies"]) {
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
    requiredTags: ["latest"]
  }), ["@threadlabs/looma is not public"]);
});


test("reads metadata from the packument and tags from npm's uncached dist-tag endpoint", async () => {
  const requestedUrls = [];
  const entry = await fetchRegistryPackage("@threadlabs/looma", releaseVersion, async (url, options) => {
    requestedUrls.push(url.toString());
    assert.equal(options.headers.accept, "application/json");
    if (url.pathname.startsWith("/-/package/")) {
      return {
        ok: true,
        json: async () => ({ latest: releaseVersion })
      };
    }
    return {
      ok: true,
      json: async () => ({
        "dist-tags": { latest: releaseVersion },
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
  assert.deepEqual(entry.distTags, { latest: releaseVersion });
  assert.deepEqual(requestedUrls, [
    "https://registry.npmjs.org/%40threadlabs%2Flooma",
    "https://registry.npmjs.org/-/package/%40threadlabs%2Flooma/dist-tags"
  ]);
});
