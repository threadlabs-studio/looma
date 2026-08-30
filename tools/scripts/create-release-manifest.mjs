import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { RELEASE_PACKAGE_NAMES, RELEASE_VERSION } from "./release-config.mjs";

const INTERNAL_DEPENDENCY_FIELDS = ["dependencies", "optionalDependencies"];

export function internalDependencies(packageJson) {
  const dependencies = new Set();
  for (const field of INTERNAL_DEPENDENCY_FIELDS) {
    for (const dependencyName of Object.keys(packageJson[field] ?? {})) {
      if (RELEASE_PACKAGE_NAMES.has(dependencyName)) {
        dependencies.add(dependencyName);
      }
    }
  }
  return [...dependencies].sort();
}

export function topologicallySortPackages(packages) {
  const byName = new Map(packages.map((entry) => [entry.packageJson.name, entry]));
  const originalOrder = new Map(packages.map((entry, index) => [entry.packageJson.name, index]));
  const pendingDependencies = new Map();
  const dependents = new Map();

  for (const entry of packages) {
    const name = entry.packageJson.name;
    const dependencies = internalDependencies(entry.packageJson);
    for (const dependencyName of dependencies) {
      if (!byName.has(dependencyName)) {
        throw new Error(`${name} depends on missing release package ${dependencyName}`);
      }
      if (!dependents.has(dependencyName)) {
        dependents.set(dependencyName, new Set());
      }
      dependents.get(dependencyName).add(name);
    }
    pendingDependencies.set(name, new Set(dependencies));
  }

  const ready = packages
    .map((entry) => entry.packageJson.name)
    .filter((name) => pendingDependencies.get(name).size === 0)
    .sort((left, right) => originalOrder.get(left) - originalOrder.get(right));
  const ordered = [];

  while (ready.length > 0) {
    const name = ready.shift();
    ordered.push(byName.get(name));
    for (const dependentName of dependents.get(name) ?? []) {
      const dependencies = pendingDependencies.get(dependentName);
      dependencies.delete(name);
      if (dependencies.size === 0) {
        ready.push(dependentName);
        ready.sort((left, right) => originalOrder.get(left) - originalOrder.get(right));
      }
    }
  }

  if (ordered.length !== packages.length) {
    const cycleMembers = [...pendingDependencies.entries()]
      .filter(([, dependencies]) => dependencies.size > 0)
      .map(([name]) => name)
      .sort();
    throw new Error(`release package dependency cycle: ${cycleMembers.join(", ")}`);
  }

  return ordered;
}

export async function sha256File(filePath) {
  const bytes = await readFile(filePath);
  return createHash("sha256").update(bytes).digest("hex");
}

export function createReleaseManifest({
  sourceCommit,
  nodeVersion,
  pnpmVersion,
  npmVersion,
  packages,
  releaseEligible,
  exceptions = [],
  approvals,
  evidence
}) {
  const orderedPackages = topologicallySortPackages(packages);
  return {
    schemaVersion: 1,
    releaseVersion: RELEASE_VERSION,
    sourceCommit,
    createdAt: new Date().toISOString(),
    releaseEligible,
    exceptions,
    approvals,
    evidence,
    toolchain: {
      node: nodeVersion,
      pnpm: pnpmVersion,
      npm: npmVersion
    },
    plannedTags: {
      initial: "candidate",
      promoted: "latest"
    },
    packages: orderedPackages.map((entry, publishIndex) => ({
      publishIndex,
      name: entry.packageJson.name,
      version: entry.packageJson.version,
      internalDependencies: internalDependencies(entry.packageJson),
      tarball: entry.tarball,
      sha256: entry.sha256,
      bytes: entry.bytes
    }))
  };
}
