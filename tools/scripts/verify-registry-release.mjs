import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { RELEASE_PACKAGES } from "./release-config.mjs";
import { collectRegistryReleaseIssues } from "./registry-release.mjs";
import { argumentValue, fileDigests } from "./publish-release.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");
const registry = "https://registry.npmjs.org/";

export function assertPathInsideRepository(filePath, label) {
  if (filePath === repoRoot || !filePath.startsWith(`${repoRoot}${path.sep}`)) {
    throw new Error(`${label} must stay inside the repository`);
  }
}

async function artifactIntegrity(filePath, expectedSha256) {
  const digests = await fileDigests(filePath);
  if (digests.sha256 !== expectedSha256) {
    throw new Error(`${path.basename(filePath)} SHA-256 differs from the approved manifest`);
  }
  return digests.integrity;
}

export async function fetchRegistryPackage(name, version, fetchImpl = fetch) {
  const response = await fetchImpl(new URL(encodeURIComponent(name), registry), {
    cache: "no-store",
    headers: { accept: "application/json", "cache-control": "no-cache" }
  });
  if (!response.ok) {
    return { name, version, public: false, distTags: {} };
  }
  const packument = await response.json();
  const metadata = packument.versions?.[version];
  if (!metadata) {
    return {
      name,
      version,
      public: true,
      distTags: packument["dist-tags"] ?? {}
    };
  }
  return {
    name: metadata.name,
    version: metadata.version,
    public: true,
    integrity: metadata.dist?.integrity,
    license: metadata.license,
    repository: metadata.repository,
    homepage: metadata.homepage,
    dependencies: metadata.dependencies ?? {},
    optionalDependencies: metadata.optionalDependencies ?? {},
    peerDependencies: metadata.peerDependencies ?? {},
    distTags: packument["dist-tags"] ?? {},
    provenancePredicateType: metadata.dist?.attestations?.provenance?.predicateType ?? null
  };
}

export async function loadApprovedRelease({ manifestPath }) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const artifactDirectory = path.dirname(manifestPath);
  const [sourceEntries, packagesWithIntegrity] = await Promise.all([
    Promise.all(RELEASE_PACKAGES.map(async (releasePackage) => [
      releasePackage.name,
      JSON.parse(await readFile(
        path.join(repoRoot, releasePackage.directory, "package.json"),
        "utf8"
      ))
    ])),
    Promise.all((manifest.packages ?? []).map(async (releasePackage) => {
      if (path.basename(releasePackage.tarball) !== releasePackage.tarball) {
        throw new Error(`${releasePackage.name} tarball path is not a basename`);
      }
      return {
        ...releasePackage,
        integrity: await artifactIntegrity(
          path.join(artifactDirectory, releasePackage.tarball),
          releasePackage.sha256
        )
      };
    }))
  ]);
  return {
    manifest: { ...manifest, packages: packagesWithIntegrity },
    sourcePackages: Object.fromEntries(sourceEntries)
  };
}

export async function fetchRegistryRelease(approvedRelease, fetchImpl = fetch) {
  const registryEntries = await Promise.all(approvedRelease.manifest.packages.map(async (releasePackage) => [
    releasePackage.name,
    await fetchRegistryPackage(releasePackage.name, releasePackage.version, fetchImpl)
  ]));
  return {
    ...approvedRelease,
    registryPackages: Object.fromEntries(registryEntries)
  };
}

export async function loadRegistryRelease({ manifestPath, fetchImpl = fetch }) {
  return fetchRegistryRelease(await loadApprovedRelease({ manifestPath }), fetchImpl);
}

export function registryEvidence({ manifest, registryPackages, requiredTags }) {
  return {
    schemaVersion: 1,
    verifiedAt: new Date().toISOString(),
    registry,
    sourceCommit: manifest.sourceCommit,
    releaseVersion: manifest.releaseVersion,
    requiredTags,
    packages: manifest.packages.map((releasePackage) => {
      const registryPackage = registryPackages[releasePackage.name];
      return {
        name: releasePackage.name,
        version: releasePackage.version,
        integrity: registryPackage.integrity,
        distTags: registryPackage.distTags,
        provenancePredicateType: registryPackage.provenancePredicateType
      };
    })
  };
}

async function main() {
  const tag = argumentValue("--tag", "candidate");
  if (!["candidate", "latest"].includes(tag)) {
    throw new Error("--tag must be candidate or latest");
  }
  const manifestPath = path.resolve(
    repoRoot,
    argumentValue("--manifest", ".release/artifacts/release-manifest.json")
  );
  const outputPath = path.resolve(
    repoRoot,
    argumentValue("--output", `.release/evidence/registry-${tag}.json`)
  );
  assertPathInsideRepository(manifestPath, "release manifest");
  assertPathInsideRepository(outputPath, "registry evidence output");

  const approvedRelease = await loadApprovedRelease({ manifestPath });
  let state;
  let issues = [];
  for (let attempt = 0; attempt < 20; attempt += 1) {
    state = await fetchRegistryRelease(approvedRelease);
    const requiredTags = tag === "latest" ? ["candidate", "latest"] : ["candidate"];
    issues = collectRegistryReleaseIssues({ ...state, requiredTags });
    if (issues.length === 0) break;
    if (attempt < 19) await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const checkoutCommit = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  if (checkoutCommit.status !== 0 || checkoutCommit.stdout.trim() !== state.manifest.sourceCommit) {
    throw new Error("release manifest source does not match the checked-out commit");
  }
  const requiredTags = tag === "latest" ? ["candidate", "latest"] : ["candidate"];
  if (issues.length > 0) {
    throw new Error(`registry release verification failed:\n- ${issues.join("\n- ")}`);
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(registryEvidence({
      manifest: state.manifest,
      registryPackages: state.registryPackages,
      requiredTags
    }), null, 2)}\n`,
    "utf8"
  );
  process.stdout.write(
    `Verified ${state.manifest.packages.length} public Looma ${state.manifest.releaseVersion} packages with ${requiredTags.join("+")} tags, matching integrity, metadata, dependencies, and provenance.\n`
  );
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
