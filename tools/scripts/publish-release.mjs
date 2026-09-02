import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import {
  assertExactReleasePackageSet,
  RELEASE_PACKAGES,
  RELEASE_VERSION
} from "./release-config.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");
const registry = "https://registry.npmjs.org/";
const registryScanAttempts = 121;
const registryScanIntervalMs = 10_000;

function run(command, args, { allowFailure = false, stdio = "pipe" } = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
    stdio
  });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed\n${result.stdout ?? ""}${result.stderr ?? ""}`);
  }
  return result;
}

export function argumentValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

export async function fileDigests(filePath) {
  const sha256 = createHash("sha256");
  const sha512 = createHash("sha512");
  for await (const chunk of createReadStream(filePath)) {
    sha256.update(chunk);
    sha512.update(chunk);
  }
  return {
    sha256: sha256.digest("hex"),
    integrity: `sha512-${sha512.digest("base64")}`
  };
}

function registryIntegrity(name, version) {
  const result = run(
    "npm",
    ["view", `${name}@${version}`, "dist.integrity", "--json", "--registry", registry],
    { allowFailure: true }
  );
  if (result.status !== 0) {
    if (/E404|404 Not Found/.test(`${result.stdout}\n${result.stderr}`)) {
      return null;
    }
    throw new Error(`registry integrity lookup failed for ${name}@${version}\n${result.stderr ?? ""}`);
  }
  return JSON.parse(result.stdout);
}

function registryDistTags(name) {
  const result = run(
    "npm",
    ["dist-tag", "ls", name, "--registry", registry],
    { allowFailure: true }
  );
  if (result.status !== 0) {
    if (/E404|404 Not Found/.test(`${result.stdout}\n${result.stderr}`)) return {};
    throw new Error(`registry dist-tag lookup failed for ${name}\n${result.stderr ?? ""}`);
  }
  return Object.fromEntries(
    result.stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf(": ");
        if (separator < 1) throw new Error(`invalid registry dist-tag output for ${name}`);
        return [line.slice(0, separator), line.slice(separator + 2)];
      })
  );
}

export function classifyRegistryPublication({ integrity, distTags, version }) {
  if (integrity) return { status: "available", integrity };
  if (Object.values(distTags ?? {}).includes(version)) {
    return { status: "pending", integrity: null };
  }
  return { status: "unpublished", integrity: null };
}

export async function waitForRegistryIntegrity({
  name,
  version,
  expectedIntegrity,
  attempts = registryScanAttempts,
  intervalMs = registryScanIntervalMs,
  lookup = registryIntegrity,
  delay = sleep
}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const integrity = lookup(name, version);
    if (integrity === expectedIntegrity) return integrity;
    if (integrity) {
      throw new Error(`${name}@${version} exists with different bytes`);
    }
    if (attempt < attempts - 1) await delay(intervalMs);
  }
  const timeoutMinutes = Math.ceil(((attempts - 1) * intervalMs) / 60_000);
  throw new Error(
    `${name}@${version} did not become available after npm scanning (${timeoutMinutes} minutes)`
  );
}

async function main() {
  const execute = process.argv.includes("--execute");
  const tag = argumentValue("--tag", "candidate");
  const manifestArgument = argumentValue(
    "--manifest",
    ".release/artifacts/release-manifest.json"
  );
  const manifestPath = path.resolve(repoRoot, manifestArgument);
  const artifactDirectory = path.dirname(manifestPath);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

  if (!manifest.releaseEligible) {
    throw new Error(`release manifest is not eligible: ${(manifest.exceptions ?? []).join("; ")}`);
  }
  if (manifest.releaseVersion !== RELEASE_VERSION) {
    throw new Error(`release manifest version must be ${RELEASE_VERSION}`);
  }
  if (tag !== "candidate") {
    throw new Error("initial publication may only use the candidate dist-tag");
  }
  assertExactReleasePackageSet(manifest.packages);

  const publishedBefore = new Set();
  for (const [index, releasePackage] of manifest.packages.entries()) {
    if (releasePackage.publishIndex !== index) {
      throw new Error(`${releasePackage.name} has an invalid publish index`);
    }
    if (releasePackage.version !== RELEASE_VERSION) {
      throw new Error(`${releasePackage.name} has an invalid release version`);
    }
    if (path.basename(releasePackage.tarball) !== releasePackage.tarball) {
      throw new Error(`${releasePackage.name} tarball path is not a basename`);
    }
    for (const dependencyName of releasePackage.internalDependencies ?? []) {
      if (!publishedBefore.has(dependencyName)) {
        throw new Error(`${releasePackage.name} is ordered before ${dependencyName}`);
      }
    }
    publishedBefore.add(releasePackage.name);
  }

  const currentCommit = run("git", ["rev-parse", "HEAD"]).stdout.trim();
  if (currentCommit !== manifest.sourceCommit) {
    throw new Error(`manifest source ${manifest.sourceCommit} does not match checkout ${currentCommit}`);
  }
  if (execute && process.env.LOOMA_RELEASE_PUBLISH !== "approved") {
    throw new Error("execution requires LOOMA_RELEASE_PUBLISH=approved from the protected environment");
  }

  const pendingIntegrityChecks = [];
  for (const releasePackage of manifest.packages) {
    const tarballPath = path.join(artifactDirectory, releasePackage.tarball);
    const digests = await fileDigests(tarballPath);
    if (digests.sha256 !== releasePackage.sha256) {
      throw new Error(`${releasePackage.name} tarball SHA-256 differs from the approved manifest`);
    }

    const publication = classifyRegistryPublication({
      integrity: registryIntegrity(releasePackage.name, releasePackage.version),
      distTags: registryDistTags(releasePackage.name),
      version: releasePackage.version
    });
    if (publication.status === "available") {
      if (publication.integrity !== digests.integrity) {
        throw new Error(`${releasePackage.name}@${releasePackage.version} exists with different bytes`);
      }
      process.stdout.write(`${releasePackage.name}@${releasePackage.version} already matches; skipping\n`);
      continue;
    }

    if (publication.status === "pending") {
      process.stdout.write(
        `${releasePackage.name}@${releasePackage.version} is awaiting npm publish-time scanning; skipping upload\n`
      );
      if (execute) {
        pendingIntegrityChecks.push({
          name: releasePackage.name,
          version: releasePackage.version,
          expectedIntegrity: digests.integrity
        });
      }
      continue;
    }

    if (!execute) {
      process.stdout.write(`Would publish ${releasePackage.tarball} with tag ${tag}\n`);
      continue;
    }

    run(
      "npm",
      [
        "publish",
        tarballPath,
        "--tag",
        tag,
        "--access",
        "public",
        "--provenance",
        "--registry",
        registry
      ],
      { stdio: "inherit" }
    );
    pendingIntegrityChecks.push({
      name: releasePackage.name,
      version: releasePackage.version,
      expectedIntegrity: digests.integrity
    });
  }

  await Promise.all(pendingIntegrityChecks.map((releasePackage) =>
    waitForRegistryIntegrity(releasePackage)
  ));
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
