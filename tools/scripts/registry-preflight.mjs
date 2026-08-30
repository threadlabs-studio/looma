import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { argumentValue } from "./publish-release.mjs";
import {
  assertExactReleasePackageSet,
  RELEASE_PACKAGES,
  RELEASE_VERSION
} from "./release-config.mjs";
import { packagePublicationState, scopeAuthorization } from "./registry-preflight-policy.mjs";
import { loadApprovedRelease } from "./verify-registry-release.mjs";

const expectedRegistry = "https://registry.npmjs.org/";
const scopeName = "threadlabs";
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");

function run(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", env: process.env });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed\n${result.stderr ?? ""}`);
  }
  return result;
}

function parseJson(value, label) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} did not return valid JSON`);
  }
}

function isNotFound(result) {
  return result.status !== 0 && /E404|404 Not Found/.test(`${result.stdout}\n${result.stderr}`);
}

async function main() {
  const manifestPath = path.resolve(
    repoRoot,
    argumentValue("--manifest", ".release/artifacts/release-manifest.json")
  );
  const approvedRelease = await loadApprovedRelease({ manifestPath });
  if (approvedRelease.manifest.releaseEligible !== true) {
    throw new Error("release manifest must be eligible before registry preflight");
  }
  if (approvedRelease.manifest.releaseVersion !== RELEASE_VERSION) {
    throw new Error(`release manifest version must be ${RELEASE_VERSION}`);
  }
  assertExactReleasePackageSet(approvedRelease.manifest.packages);
  const approvedPackages = new Map(
    approvedRelease.manifest.packages.map((releasePackage) => [releasePackage.name, releasePackage])
  );

  const registry = run("npm", ["config", "get", "registry"]).stdout.trim();
  if (registry !== expectedRegistry) {
    throw new Error(`npm registry must be ${expectedRegistry}, received ${registry}`);
  }

  const username = run("npm", ["whoami", "--registry", expectedRegistry]).stdout.trim();
  if (!username) {
    throw new Error("npm whoami returned an empty username");
  }

  let authorization;
  if (username === scopeName) {
    authorization = scopeAuthorization({ username, scopeName });
  } else {
    const membershipResult = run(
      "npm",
      ["org", "ls", scopeName, username, "--json", "--registry", expectedRegistry],
      { allowFailure: true }
    );
    if (membershipResult.status !== 0) {
      throw new Error(`npm identity ${username} cannot prove membership in @${scopeName}`);
    }
    const membership = parseJson(membershipResult.stdout, "npm org membership");
    authorization = scopeAuthorization({ username, scopeName, membership });
  }

  const profileResult = run(
    "npm",
    ["profile", "get", "--json", "--registry", expectedRegistry],
    { allowFailure: true }
  );
  if (profileResult.status !== 0) {
    throw new Error("npm profile policy could not be read for the release identity");
  }
  const profile = parseJson(profileResult.stdout, "npm profile");
  const twoFactorMode = profile.tfa?.mode ?? profile.tfa ?? "unknown";

  const packages = [];
  for (const releasePackage of RELEASE_PACKAGES) {
    const approvedPackage = approvedPackages.get(releasePackage.name);
    if (!approvedPackage) {
      throw new Error(`release manifest is missing ${releasePackage.name}`);
    }
    const packageResult = run(
      "npm",
      ["view", releasePackage.name, "versions", "--json", "--registry", expectedRegistry],
      { allowFailure: true }
    );
    if (packageResult.status !== 0 && !isNotFound(packageResult)) {
      throw new Error(
        `${releasePackage.name} registry state could not be verified\n${packageResult.stderr ?? ""}`
      );
    }

    let registryIntegrity = null;
    const packageExists = packageResult.status === 0;
    if (packageExists) {
      const integrityResult = run(
        "npm",
        [
          "view",
          `${releasePackage.name}@${RELEASE_VERSION}`,
          "dist.integrity",
          "--json",
          "--registry",
          expectedRegistry
        ],
        { allowFailure: true }
      );
      if (integrityResult.status === 0) {
        registryIntegrity = parseJson(integrityResult.stdout, `${releasePackage.name} integrity`);
      } else if (!isNotFound(integrityResult)) {
        throw new Error(
          `${releasePackage.name}@${RELEASE_VERSION} integrity could not be verified\n${integrityResult.stderr ?? ""}`
        );
      }
    }
    packages.push(packagePublicationState({
      name: releasePackage.name,
      version: RELEASE_VERSION,
      packageExists,
      approvedIntegrity: approvedPackage.integrity,
      registryIntegrity
    }));
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        registry,
        username,
        scope: `@${scopeName}`,
        scopeAuthorization: authorization,
        twoFactorMode,
        packages,
        mutationPerformed: false
      },
      null,
      2
    )}\n`
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
