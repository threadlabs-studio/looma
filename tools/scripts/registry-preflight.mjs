import { spawnSync } from "node:child_process";

import { RELEASE_PACKAGES } from "./release-config.mjs";

const expectedRegistry = "https://registry.npmjs.org/";
const scopeName = "looma";

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
  const registry = run("npm", ["config", "get", "registry"]).stdout.trim();
  if (registry !== expectedRegistry) {
    throw new Error(`npm registry must be ${expectedRegistry}, received ${registry}`);
  }

  const username = run("npm", ["whoami", "--registry", expectedRegistry]).stdout.trim();
  if (!username) {
    throw new Error("npm whoami returned an empty username");
  }

  let scopeAuthorization;
  if (username === scopeName) {
    scopeAuthorization = { kind: "user-scope", role: "owner" };
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
    const role =
      typeof membership === "string"
        ? membership
        : membership?.[username] ?? membership?.role ?? membership?.org?.role;
    if (!role) {
      throw new Error(`npm identity ${username} has no reported role in @${scopeName}`);
    }
    scopeAuthorization = { kind: "organization", role };
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
    const result = run(
      "npm",
      ["view", releasePackage.name, "version", "--json", "--registry", expectedRegistry],
      { allowFailure: true }
    );
    if (result.status === 0) {
      throw new Error(`${releasePackage.name} already exists on npm; first-publication preflight stopped`);
    }
    if (!isNotFound(result)) {
      throw new Error(`${releasePackage.name} availability could not be verified\n${result.stderr ?? ""}`);
    }
    packages.push({ name: releasePackage.name, available: true });
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        registry,
        username,
        scope: `@${scopeName}`,
        scopeAuthorization,
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
