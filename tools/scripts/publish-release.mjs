import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { RELEASE_PACKAGES, RELEASE_VERSION } from "./release-config.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");
const registry = "https://registry.npmjs.org/";

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

function argumentValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function fileDigests(filePath) {
  const bytes = await readFile(filePath);
  return {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`
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
  const expectedPackageNames = RELEASE_PACKAGES.map((entry) => entry.name);
  const manifestPackageNames = manifest.packages.map((entry) => entry.name);
  if (JSON.stringify(manifestPackageNames.sort()) !== JSON.stringify([...expectedPackageNames].sort())) {
    throw new Error("release manifest does not contain the exact approved package set");
  }

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

  for (const releasePackage of manifest.packages) {
    const tarballPath = path.join(artifactDirectory, releasePackage.tarball);
    const digests = await fileDigests(tarballPath);
    if (digests.sha256 !== releasePackage.sha256) {
      throw new Error(`${releasePackage.name} tarball SHA-256 differs from the approved manifest`);
    }

    const existingIntegrity = registryIntegrity(releasePackage.name, releasePackage.version);
    if (existingIntegrity) {
      if (existingIntegrity !== digests.integrity) {
        throw new Error(`${releasePackage.name}@${releasePackage.version} exists with different bytes`);
      }
      process.stdout.write(`${releasePackage.name}@${releasePackage.version} already matches; skipping\n`);
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
    const publishedIntegrity = registryIntegrity(releasePackage.name, releasePackage.version);
    if (publishedIntegrity !== digests.integrity) {
      throw new Error(`${releasePackage.name}@${releasePackage.version} registry bytes do not match`);
    }
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
