import assert from "node:assert/strict";
import test from "node:test";

import { createReleaseManifest, topologicallySortPackages } from "./create-release-manifest.mjs";
import { assertExactReleasePackageSet } from "./release-config.mjs";

function entry(name, dependencies = {}) {
  return { packageJson: { name, dependencies } };
}

test("derives a deterministic dependency-first publish order", () => {
  const ordered = topologicallySortPackages([
    entry("@threadlabs/looma-tokens"),
    entry("@threadlabs/looma-layout"),
    entry("@threadlabs/looma-core"),
    entry("@threadlabs/looma-editor", { "@threadlabs/looma-core": "0.1.0", "@threadlabs/looma-tokens": "0.1.0" }),
    entry("@threadlabs/looma-vue", {
      "@threadlabs/looma-core": "0.1.0",
      "@threadlabs/looma-editor": "0.1.0",
      "@threadlabs/looma-layout": "0.1.0"
    })
  ]);

  assert.deepEqual(
    ordered.map((item) => item.packageJson.name),
    ["@threadlabs/looma-tokens", "@threadlabs/looma-layout", "@threadlabs/looma-core", "@threadlabs/looma-editor", "@threadlabs/looma-vue"]
  );
});

test("rejects a missing internal release dependency", () => {
  assert.throws(
    () => topologicallySortPackages([entry("@threadlabs/looma-editor", { "@threadlabs/looma-core": "0.1.0" })]),
    /depends on missing release package @threadlabs\/looma-core/
  );
});

test("rejects an internal release dependency cycle", () => {
  assert.throws(
    () =>
      topologicallySortPackages([
        entry("@threadlabs/looma-core", { "@threadlabs/looma-editor": "0.1.0" }),
        entry("@threadlabs/looma-editor", { "@threadlabs/looma-core": "0.1.0" })
      ]),
    /dependency cycle: @threadlabs\/looma-core, @threadlabs\/looma-editor/
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
        packageJson: { name: "@threadlabs/looma-tokens", version: "0.1.0" },
        tarball: "threadlabs-looma-tokens-0.1.0.tgz",
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
    "@threadlabs/looma-tokens",
    "@threadlabs/looma-layout",
    "@threadlabs/looma-core",
    "@threadlabs/looma-editor",
    "@threadlabs/looma-vue"
  ].map((name) => ({ name }));

  assert.doesNotThrow(() => assertExactReleasePackageSet(packages));
  assert.throws(
    () => assertExactReleasePackageSet([...packages.slice(0, -1), { name: "@threadlabs/looma-unexpected" }]),
    /does not contain the exact approved package set/
  );
});
