import assert from "node:assert/strict";
import test from "node:test";

import { createReleaseManifest, topologicallySortPackages } from "./create-release-manifest.mjs";
import { assertExactReleasePackageSet } from "./release-config.mjs";

function entry(name, dependencies = {}) {
  return { packageJson: { name, dependencies } };
}

test("derives a deterministic dependency-first publish order", () => {
  const ordered = topologicallySortPackages([
    entry("@looma/tokens"),
    entry("@looma/layout"),
    entry("@looma/core"),
    entry("@looma/editor", { "@looma/core": "0.1.0", "@looma/tokens": "0.1.0" }),
    entry("@looma/vue", {
      "@looma/core": "0.1.0",
      "@looma/editor": "0.1.0",
      "@looma/layout": "0.1.0"
    })
  ]);

  assert.deepEqual(
    ordered.map((item) => item.packageJson.name),
    ["@looma/tokens", "@looma/layout", "@looma/core", "@looma/editor", "@looma/vue"]
  );
});

test("rejects a missing internal release dependency", () => {
  assert.throws(
    () => topologicallySortPackages([entry("@looma/editor", { "@looma/core": "0.1.0" })]),
    /depends on missing release package @looma\/core/
  );
});

test("rejects an internal release dependency cycle", () => {
  assert.throws(
    () =>
      topologicallySortPackages([
        entry("@looma/core", { "@looma/editor": "0.1.0" }),
        entry("@looma/editor", { "@looma/core": "0.1.0" })
      ]),
    /dependency cycle: @looma\/core, @looma\/editor/
  );
});

test("records a deterministic inventory of every packed file", () => {
  const manifest = createReleaseManifest({
    sourceCommit: "a".repeat(40),
    nodeVersion: "v20.19.6",
    pnpmVersion: "10.15.0",
    npmVersion: "10.8.2",
    packages: [
      {
        packageJson: { name: "@looma/tokens", version: "0.1.0" },
        tarball: "looma-tokens-0.1.0.tgz",
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
  const packages = [
    "@looma/tokens",
    "@looma/layout",
    "@looma/core",
    "@looma/editor",
    "@looma/vue"
  ].map((name) => ({ name }));

  assert.doesNotThrow(() => assertExactReleasePackageSet(packages));
  assert.throws(
    () => assertExactReleasePackageSet([...packages.slice(0, -1), { name: "@looma/unexpected" }]),
    /does not contain the exact approved package set/
  );
});
