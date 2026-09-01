import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertExactReleasePackageSet,
  RELEASE_VERSION
} from "./release-config.mjs";
import {
  assertPathInsideRepository,
  loadApprovedRelease
} from "./verify-registry-release.mjs";
import { argumentValue, fileDigests } from "./publish-release.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");
const registry = "https://registry.npmjs.org/";
const fixtureDirectory = path.join(repoRoot, "tests/release/consumer");
const DEFAULT_MANIFEST = ".release/artifacts/release-manifest.json";
const DEFAULT_EVIDENCE = ".release/evidence/public-consumer.json";
const DEFAULT_LOCKFILE_EVIDENCE = ".release/evidence/public-consumer-pnpm-lock.yaml";
const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "optionalDependencies"];
const FORBIDDEN_RESOLUTION = /(?:\b(?:file|link|workspace|github):|git\+|localhost|127\.0\.0\.1|threadlabs-studio\/looma|[\\/]looma-knit[\\/]looma(?:[\\/]|$))/i;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function repositoryRelative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function commandText(command, args) {
  return `${command} ${args.join(" ")}`;
}

function run(command, args, { cwd = repoRoot, env = process.env, capture = false } = {}) {
  process.stdout.write(`\n$ ${commandText(command, args)}\n`);
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit"
  });
  if (result.status !== 0) {
    throw new Error(
      `${commandText(command, args)} failed (${result.status})\n${result.stdout ?? ""}${result.stderr ?? ""}`
    );
  }
  return (result.stdout ?? "").trim();
}

async function sha256(filePath) {
  return (await fileDigests(filePath)).sha256;
}

export function validatePublicConsumerManifest({ manifest, checkoutCommit, sourcePackages }) {
  assert(
    manifest.releaseEligible === true,
    `release manifest must be eligible: ${(manifest.exceptions ?? []).join("; ")}`
  );
  assert(
    manifest.releaseVersion === RELEASE_VERSION,
    `release manifest version must be ${RELEASE_VERSION}`
  );
  assertExactReleasePackageSet(manifest.packages ?? []);
  assert(
    manifest.sourceCommit === checkoutCommit,
    `release manifest source ${manifest.sourceCommit} does not match checkout HEAD ${checkoutCommit}`
  );

  for (const [index, releasePackage] of manifest.packages.entries()) {
    assert(releasePackage.publishIndex === index, `${releasePackage.name} has an invalid publish index`);
    assert(
      releasePackage.version === RELEASE_VERSION,
      `${releasePackage.name} manifest version must be exact ${RELEASE_VERSION}`
    );
    assert(
      typeof releasePackage.sha256 === "string" && /^[a-f0-9]{64}$/i.test(releasePackage.sha256),
      `${releasePackage.name} manifest SHA-256 is missing or invalid`
    );
    assert(
      typeof releasePackage.tarball === "string"
        && path.basename(releasePackage.tarball) === releasePackage.tarball,
      `${releasePackage.name} manifest tarball must be a basename`
    );
    const sourcePackage = sourcePackages?.[releasePackage.name];
    assert(sourcePackage?.name === releasePackage.name, `${releasePackage.name} source identity differs from manifest`);
    assert(
      sourcePackage?.version === releasePackage.version,
      `${releasePackage.name} source version differs from manifest`
    );
  }
  return manifest;
}

export function rewriteConsumerManifest(packageJsonValue, manifest) {
  const packageJson = structuredClone(packageJsonValue);
  for (const releasePackage of manifest.packages) {
    let found = false;
    for (const field of DEPENDENCY_FIELDS) {
      if (Object.hasOwn(packageJson[field] ?? {}, releasePackage.name)) {
        packageJson[field][releasePackage.name] = releasePackage.version;
        found = true;
      }
    }
    assert(found, `consumer fixture does not declare ${releasePackage.name}`);
  }

  if (packageJson.pnpm && typeof packageJson.pnpm === "object") {
    delete packageJson.pnpm.overrides;
    if (Object.keys(packageJson.pnpm).length === 0) delete packageJson.pnpm;
  }
  return packageJson;
}

function packageLockBlock(lines, startIndex) {
  let endIndex = startIndex + 1;
  while (endIndex < lines.length && !/^  \S/.test(lines[endIndex])) endIndex += 1;
  return lines.slice(startIndex, endIndex).join("\n");
}

export function validatePublicConsumerLockfile(lockfile, manifest) {
  const lines = lockfile.split(/\r?\n/);
  const resolutions = [];

  for (const releasePackage of manifest.packages) {
    const escapedName = escapeRegExp(releasePackage.name);
    const escapedVersion = escapeRegExp(releasePackage.version);
    const occurrenceIndexes = lines
      .map((line, index) => line.includes(releasePackage.name) ? index : -1)
      .filter((index) => index >= 0);
    assert(occurrenceIndexes.length > 0, `${releasePackage.name} is absent from the consumer lockfile`);

    for (const index of occurrenceIndexes) {
      const context = lines.slice(index, Math.min(lines.length, index + 4)).join("\n");
      assert(
        !FORBIDDEN_RESOLUTION.test(context),
        `${releasePackage.name} uses a forbidden local or repository resolution`
      );
    }

    const importerKey = new RegExp(`^\\s{6}['\"]?${escapedName}['\"]?:\\s*$`);
    const importerIndex = lines.findIndex((line) => importerKey.test(line));
    assert(importerIndex >= 0, `${releasePackage.name} is absent from the root importer`);
    const importerBlock = lines.slice(importerIndex, importerIndex + 4).join("\n");
    assert(
      new RegExp(`specifier:\\s*['\"]?${escapedVersion}['\"]?(?:\\s|$)`).test(importerBlock)
        && new RegExp(`version:\\s*['\"]?${escapedVersion}(?:\\([^\\n]*\\))?['\"]?(?:\\s|$)`).test(importerBlock),
      `${releasePackage.name} must resolve at exact ${releasePackage.version}`
    );

    const exactPackageKey = new RegExp(`^  ['\"]?${escapedName}@${escapedVersion}['\"]?:\\s*$`);
    const packageIndex = lines.findIndex((line) => exactPackageKey.test(line));
    assert(packageIndex >= 0, `${releasePackage.name} must resolve at exact ${releasePackage.version}`);
    const packageKeys = lines.filter((line) => new RegExp(`^  ['\"]?${escapedName}@`).test(line));
    for (const packageKey of packageKeys) {
      assert(
        new RegExp(`^  ['\"]?${escapedName}@${escapedVersion}(?:\\([^\\n]*\\))?['\"]?:`).test(packageKey),
        `${releasePackage.name} must resolve at exact ${releasePackage.version}`
      );
    }
    const block = packageLockBlock(lines, packageIndex);
    assert(!FORBIDDEN_RESOLUTION.test(block), `${releasePackage.name} uses a forbidden local or repository resolution`);
    const integrity = block.match(/integrity:\s*([^,}\s]+)/)?.[1];
    assert(integrity?.startsWith("sha512-"), `${releasePackage.name} lockfile integrity is missing`);
    const tarball = block.match(/tarball:\s*([^,}\s]+)/)?.[1] ?? null;
    if (tarball) {
      assert(!FORBIDDEN_RESOLUTION.test(tarball), `${releasePackage.name} uses a forbidden local or repository resolution`);
      assert(
        tarball.startsWith(registry),
        `${releasePackage.name} tarball does not use ${registry}`
      );
    }
    resolutions.push({
      name: releasePackage.name,
      version: releasePackage.version,
      integrity,
      lockfileKey: `${releasePackage.name}@${releasePackage.version}`,
      tarball
    });
  }
  return resolutions;
}

export function validateInstalledReleasePackages(installedPackages, manifest) {
  const installedByName = new Map(installedPackages.map((entry) => [entry.name, entry]));
  assert(
    installedPackages.length === manifest.packages.length
      && installedByName.size === manifest.packages.length,
    "installed Looma package set differs from the release manifest"
  );
  for (const releasePackage of manifest.packages) {
    const installed = installedByName.get(releasePackage.name);
    assert(installed, `${releasePackage.name} is missing from node_modules`);
    assert(
      installed.version === releasePackage.version,
      `${releasePackage.name} installed ${installed.version} instead of ${releasePackage.version}`
    );
  }
  return installedPackages;
}

export function publicConsumerEvidence({
  manifest,
  manifestPath,
  manifestSha256,
  nodeVersion,
  pnpmVersion,
  commands,
  lockfilePath,
  lockfileSha256,
  installedPackages
}) {
  return {
    schemaVersion: 1,
    evidenceType: "public-registry-clean-consumer",
    registry,
    sourceCommit: manifest.sourceCommit,
    releaseVersion: manifest.releaseVersion,
    manifest: {
      path: manifestPath,
      sha256: manifestSha256,
      packages: manifest.packages.map(({ name, version, tarball, sha256: packageSha256 }) => ({
        name,
        version,
        tarball,
        sha256: packageSha256
      }))
    },
    toolchain: {
      node: nodeVersion,
      pnpm: pnpmVersion
    },
    commands,
    cleanConsumer: {
      fixture: "tests/release/consumer",
      fixtureLockfileCopied: false,
      localOverridesRemoved: true,
      freshTemporaryStore: true,
      onlineFetch: true,
      npmCredentialUsed: false,
      typecheck: "passed",
      ssrImport: "passed",
      installedGraph: "passed"
    },
    lockfile: {
      path: lockfilePath,
      sha256: lockfileSha256
    },
    installedPackages,
    result: "passed"
  };
}

export function publicRegistryEnvironment({
  userConfigPath,
  globalConfigPath,
  baseEnvironment = process.env
}) {
  const environment = { ...baseEnvironment };
  for (const key of Object.keys(environment)) {
    if (["NODE_AUTH_TOKEN", "NPM_TOKEN", "NPM_AUTH_TOKEN", "PNPM_TOKEN"].includes(key)
      || /^(?:NPM|PNPM)_CONFIG_.*(?:AUTH|TOKEN|PASSWORD|USERNAME)/i.test(key)) {
      delete environment[key];
    }
  }
  return {
    ...environment,
    CI: "1",
    NPM_CONFIG_USERCONFIG: userConfigPath,
    NPM_CONFIG_GLOBALCONFIG: globalConfigPath,
    NPM_CONFIG_REGISTRY: registry
  };
}

export function publicNpmConfig(manifest) {
  const scopes = new Set();
  for (const { name } of manifest.packages) {
    if (name.startsWith("@")) scopes.add(name.slice(0, name.indexOf("/")));
  }
  return [
    `registry=${registry}`,
    ...[...scopes].sort().map((scope) => `${scope}:registry=${registry}`),
    "always-auth=false",
    ""
  ].join("\n");
}

async function copyCleanFixture(destination) {
  await cp(fixtureDirectory, destination, {
    recursive: true,
    filter(source) {
      const relative = path.relative(fixtureDirectory, source);
      const firstSegment = relative.split(path.sep)[0];
      return !["node_modules", "pnpm-lock.yaml", ".npmrc"].includes(firstSegment);
    }
  });
}

async function installedReleasePackages(consumerDirectory, manifest, resolutions) {
  const canonicalConsumer = await realpath(consumerDirectory);
  const canonicalRepository = await realpath(repoRoot);
  const resolutionByName = new Map(resolutions.map((entry) => [entry.name, entry]));
  const installed = [];

  for (const releasePackage of manifest.packages) {
    const packageDirectory = await realpath(path.join(
      consumerDirectory,
      "node_modules",
      ...releasePackage.name.split("/")
    ));
    assert(
      packageDirectory.startsWith(`${canonicalConsumer}${path.sep}`),
      `${releasePackage.name} resolved outside the temporary consumer`
    );
    assert(
      !packageDirectory.startsWith(`${canonicalRepository}${path.sep}`),
      `${releasePackage.name} resolved to the Looma repository`
    );
    const packageJson = JSON.parse(await readFile(path.join(packageDirectory, "package.json"), "utf8"));
    const resolution = resolutionByName.get(releasePackage.name);
    installed.push({
      name: packageJson.name,
      version: packageJson.version,
      integrity: resolution.integrity,
      lockfileKey: resolution.lockfileKey,
      tarball: resolution.tarball
    });
  }
  return validateInstalledReleasePackages(installed, manifest);
}

async function main() {
  const manifestPath = path.resolve(repoRoot, argumentValue("--manifest", DEFAULT_MANIFEST));
  const evidencePath = path.resolve(repoRoot, argumentValue("--output", DEFAULT_EVIDENCE));
  const lockfileEvidencePath = path.resolve(
    repoRoot,
    argumentValue("--lockfile-output", DEFAULT_LOCKFILE_EVIDENCE)
  );
  assertPathInsideRepository(manifestPath, "release manifest");
  assertPathInsideRepository(evidencePath, "public consumer evidence output");
  assertPathInsideRepository(lockfileEvidencePath, "public consumer lockfile output");
  assert(evidencePath !== lockfileEvidencePath, "evidence and lockfile outputs must differ");

  await rm(evidencePath, { force: true });
  await rm(lockfileEvidencePath, { force: true });

  const approvedRelease = await loadApprovedRelease({ manifestPath });
  const checkoutCommit = run("git", ["rev-parse", "HEAD"], { capture: true });
  const manifest = validatePublicConsumerManifest({
    manifest: approvedRelease.manifest,
    checkoutCommit,
    sourcePackages: approvedRelease.sourcePackages
  });
  const pnpmVersion = run("pnpm", ["--version"], { capture: true });
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "looma-public-consumer-"));
  const consumerDirectory = path.join(temporaryRoot, "consumer");
  const storeDirectory = path.join(temporaryRoot, "pnpm-store");
  const userConfigPath = path.join(temporaryRoot, "public.npmrc");
  const globalConfigPath = path.join(temporaryRoot, "global.npmrc");
  const installArgs = [
    "install",
    "--no-frozen-lockfile",
    "--prefer-offline=false",
    "--offline=false",
    "--ignore-workspace",
    "--config.prefer-workspace-packages=false",
    "--config.link-workspace-packages=false",
    "--config.verify-store-integrity=true",
    "--store-dir",
    storeDirectory
  ];
  const evidenceCommands = [
    commandText("pnpm", [...installArgs.slice(0, -1), "<fresh-temporary-store>"]),
    "pnpm run typecheck",
    "pnpm run verify:ssr"
  ];

  try {
    await copyCleanFixture(consumerDirectory);
    const consumerPackagePath = path.join(consumerDirectory, "package.json");
    const consumerPackage = rewriteConsumerManifest(
      JSON.parse(await readFile(consumerPackagePath, "utf8")),
      manifest
    );
    await writeFile(consumerPackagePath, `${JSON.stringify(consumerPackage, null, 2)}\n`, "utf8");
    await writeFile(userConfigPath, publicNpmConfig(manifest), "utf8");
    await writeFile(globalConfigPath, "", "utf8");
    const environment = publicRegistryEnvironment({ userConfigPath, globalConfigPath });

    run("pnpm", installArgs, { cwd: consumerDirectory, env: environment });
    run("pnpm", ["run", "typecheck"], { cwd: consumerDirectory, env: environment });
    run("pnpm", ["run", "verify:ssr"], { cwd: consumerDirectory, env: environment });

    const generatedLockfilePath = path.join(consumerDirectory, "pnpm-lock.yaml");
    const lockfile = await readFile(generatedLockfilePath, "utf8");
    const resolutions = validatePublicConsumerLockfile(lockfile, manifest);
    const installedPackages = await installedReleasePackages(consumerDirectory, manifest, resolutions);

    await mkdir(path.dirname(evidencePath), { recursive: true });
    await mkdir(path.dirname(lockfileEvidencePath), { recursive: true });
    await writeFile(lockfileEvidencePath, lockfile, "utf8");
    const evidence = publicConsumerEvidence({
      manifest,
      manifestPath: repositoryRelative(manifestPath),
      manifestSha256: await sha256(manifestPath),
      nodeVersion: process.version,
      pnpmVersion,
      commands: evidenceCommands,
      lockfilePath: repositoryRelative(lockfileEvidencePath),
      lockfileSha256: await sha256(lockfileEvidencePath),
      installedPackages
    });
    await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    process.stdout.write(
      `\nVerified ${manifest.packages.length} Looma ${manifest.releaseVersion} packages in a credential-free public-registry consumer.\n`
    );
    process.stdout.write(`Evidence: ${repositoryRelative(evidencePath)}\n`);
  } finally {
    assert(
      temporaryRoot.startsWith(`${tmpdir()}${path.sep}looma-public-consumer-`),
      "refusing to remove an unexpected temporary directory"
    );
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
