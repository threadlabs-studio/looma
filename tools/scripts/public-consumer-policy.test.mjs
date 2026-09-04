import assert from "node:assert/strict";
import test from "node:test";

import {
  publicNpmConfig,
  publicConsumerEvidence,
  publicRegistryEnvironment,
  rewriteConsumerManifest,
  validateInstalledReleasePackages,
  validatePublicConsumerLockfile,
  validatePublicConsumerManifest
} from "./verify-public-consumer.mjs";

const releaseNames = ["@threadlabs/looma"];

function releaseManifest(overrides = {}) {
  return {
    schemaVersion: 1,
    releaseVersion: "0.1.7",
    sourceCommit: "a".repeat(40),
    releaseEligible: true,
    exceptions: [],
    packages: releaseNames.map((name, publishIndex) => ({
      publishIndex,
      name,
      version: "0.1.7",
      tarball: `${name.replace(/^@/, "").replace("/", "-")}-0.1.7.tgz`,
      sha256: String(publishIndex + 1).repeat(64),
      integrity: `sha512-${name}`
    })),
    ...overrides
  };
}

function sourcePackages() {
  return Object.fromEntries(releaseNames.map((name) => [name, { name, version: "0.1.7" }]));
}

function publicLockfile(version = "0.1.7") {
  const dependencies = releaseNames.map((name) => `      '${name}':\n        specifier: ${version}\n        version: ${version}`).join("\n");
  const packages = releaseNames.map((name) => `  '${name}@${version}':\n    resolution: {integrity: sha512-${name}}`).join("\n\n");
  const snapshots = releaseNames.map((name) => `  '${name}@${version}': {}`).join("\n\n");
  return `lockfileVersion: '9.0'\n\nimporters:\n\n  .:\n    dependencies:\n${dependencies}\n\npackages:\n\n${packages}\n\nsnapshots:\n\n${snapshots}\n`;
}

test("accepts an eligible current manifest and derives exact public dependencies", () => {
  const manifest = releaseManifest();
  assert.doesNotThrow(() => validatePublicConsumerManifest({
    manifest,
    checkoutCommit: manifest.sourceCommit,
    sourcePackages: sourcePackages()
  }));

  const rewritten = rewriteConsumerManifest({
    name: "fixture",
    dependencies: Object.fromEntries(releaseNames.map((name) => [name, "file:artifact.tgz"])),
    pnpm: { overrides: { "@threadlabs/looma": "file:artifact.tgz" } }
  }, manifest);
  assert.deepEqual(
    Object.fromEntries(releaseNames.map((name) => [name, rewritten.dependencies[name]])),
    Object.fromEntries(releaseNames.map((name) => [name, "0.1.7"]))
  );
  assert.equal(rewritten.pnpm, undefined);

  const resolutions = validatePublicConsumerLockfile(publicLockfile(), manifest);
  assert.deepEqual(resolutions.map(({ name, version }) => ({ name, version })),
    releaseNames.map((name) => ({ name, version: "0.1.7" })));

  const installed = releaseNames.map((name) => ({ name, version: "0.1.7" }));
  assert.doesNotThrow(() => validateInstalledReleasePackages(installed, manifest));
});

test("rejects ineligible and stale release manifests", () => {
  assert.throws(
    () => validatePublicConsumerManifest({
      manifest: releaseManifest({ releaseEligible: false, exceptions: ["approval missing"] }),
      checkoutCommit: "a".repeat(40),
      sourcePackages: sourcePackages()
    }),
    /release manifest must be eligible: approval missing/
  );
  assert.throws(
    () => validatePublicConsumerManifest({
      manifest: releaseManifest(),
      checkoutCommit: "b".repeat(40),
      sourcePackages: sourcePackages()
    }),
    /does not match checkout HEAD/
  );
});

test("rejects local Looma lockfile resolutions", () => {
  const lockfile = publicLockfile().replace(
    "specifier: 0.1.7\n        version: 0.1.7",
    "specifier: file:../../../.release/artifacts/looma-0.1.7.tgz\n        version: file:../../../.release/artifacts/looma-0.1.7.tgz"
  );
  assert.throws(
    () => validatePublicConsumerLockfile(lockfile, releaseManifest()),
    /@threadlabs\/looma.*forbidden local or repository resolution/
  );
});

test("rejects exact-version drift in the lockfile and installed graph", () => {
  assert.throws(
    () => validatePublicConsumerLockfile(publicLockfile("0.1.2"), releaseManifest()),
    /@threadlabs\/looma.*exact 0\.1\.7/
  );
  assert.throws(
    () => validateInstalledReleasePackages(
      releaseNames.map((name) => ({ name, version: "0.1.2" })),
      releaseManifest()
    ),
    /@threadlabs\/looma installed 0\.1\.2 instead of 0\.1\.7/
  );
});

test("builds deterministic evidence from manifest identities and public resolutions", () => {
  const manifest = releaseManifest();
  const evidence = publicConsumerEvidence({
    manifest,
    manifestPath: ".release/artifacts/release-manifest.json",
    manifestSha256: "f".repeat(64),
    nodeVersion: "v22.14.0",
    pnpmVersion: "10.7.0",
    commands: ["pnpm install <public-consumer-options>"],
    lockfilePath: ".release/evidence/public-consumer-pnpm-lock.yaml",
    lockfileSha256: "e".repeat(64),
    installedPackages: releaseNames.map((name) => ({
      name,
      version: "0.1.7",
      integrity: `sha512-${name}`
    }))
  });
  assert.equal(evidence.registry, "https://registry.npmjs.org/");
  assert.equal(evidence.sourceCommit, manifest.sourceCommit);
  assert.deepEqual(evidence.manifest.packages[0], {
    name: "@threadlabs/looma",
    version: "0.1.7",
    tarball: "threadlabs-looma-0.1.7.tgz",
    sha256: "1".repeat(64)
  });
  assert.equal(evidence.result, "passed");
  assert.equal("createdAt" in evidence, false);
});

test("builds an isolated public-registry environment without npm credentials", () => {
  const environment = publicRegistryEnvironment({
    userConfigPath: "/tmp/public.npmrc",
    globalConfigPath: "/tmp/global.npmrc",
    baseEnvironment: {
      PATH: "/bin",
      NODE_AUTH_TOKEN: "secret-1",
      NPM_TOKEN: "secret-2",
      NPM_AUTH_TOKEN: "secret-3",
      PNPM_TOKEN: "secret-4",
      NPM_CONFIG__AUTH: "secret-5",
      npm_config_password: "secret-6"
    }
  });
  assert.equal(environment.PATH, "/bin");
  assert.equal(environment.NPM_CONFIG_REGISTRY, "https://registry.npmjs.org/");
  assert.equal(environment.NPM_CONFIG_USERCONFIG, "/tmp/public.npmrc");
  for (const key of [
    "NODE_AUTH_TOKEN",
    "NPM_TOKEN",
    "NPM_AUTH_TOKEN",
    "PNPM_TOKEN",
    "NPM_CONFIG__AUTH",
    "npm_config_password"
  ]) {
    assert.equal(key in environment, false, key);
  }
});

test("derives public registry scopes from the approved manifest", () => {
  const npmConfig = publicNpmConfig(releaseManifest());

  assert.match(npmConfig, /^registry=https:\/\/registry\.npmjs\.org\/$/m);
  assert.match(npmConfig, /^@threadlabs:registry=https:\/\/registry\.npmjs\.org\/$/m);
  assert.doesNotMatch(npmConfig, /^@looma:registry=/m);
  assert.match(npmConfig, /^always-auth=false$/m);
});
