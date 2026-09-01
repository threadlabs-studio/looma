import assert from "node:assert/strict";
import test from "node:test";

import { createReleaseManifest, topologicallySortPackages } from "./create-release-manifest.mjs";
import { assertExactReleasePackageSet } from "./release-config.mjs";

function entry(name, dependencies = {}) {
  return { packageJson: { name, dependencies } };
}

test("keeps the singleton facade release manifest deterministic", () => {
  const ordered = topologicallySortPackages([entry("@threadlabs/looma")]);

  assert.deepEqual(ordered.map((item) => item.packageJson.name), ["@threadlabs/looma"]);
});

test("records a deterministic inventory of every packed file", () => {
  const manifest = createReleaseManifest({
    sourceCommit: "a".repeat(40),
    nodeVersion: "v20.19.6",
    pnpmVersion: "10.15.0",
    npmVersion: "10.8.2",
    packages: [
      {
        packageJson: { name: "@threadlabs/looma", version: "0.1.0" },
        tarball: "threadlabs-looma-0.1.0.tgz",
        sha256: "b".repeat(64),
        bytes: 123,
        tarEntries: ["package/package.json", "package/LICENSE", "package/dist/tokens.css"]
      }
    ],
    releaseEligible: true,
    approvals: { npm: "owner", documentation: "docs", knit: "knit" },
    evidence: {}
  });

  assert.deepEqual(manifest.packages[0].files, [
    "package/LICENSE",
    "package/dist/tokens.css",
    "package/package.json"
  ]);
});

test("accepts only the exact configured release package set", () => {
  const packages = [{ name: "@threadlabs/looma" }];

  assert.doesNotThrow(() => assertExactReleasePackageSet(packages));
  assert.throws(
    () => assertExactReleasePackageSet([{ name: "@threadlabs/looma-core" }]),
    /does not contain the exact approved package set/
  );
});
