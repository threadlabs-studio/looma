import { RELEASE_PACKAGE_NAMES, RELEASE_VERSION } from "./release-config.mjs";

const PROVENANCE_PREDICATE = "https://slsa.dev/provenance/v1";

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function repositoryUrl(value) {
  return typeof value === "string" ? value : object(value).url;
}

function internalDependencies(packageJson) {
  const result = {};
  for (const field of ["dependencies", "optionalDependencies"]) {
    for (const [name, range] of Object.entries(object(packageJson[field]))) {
      if (RELEASE_PACKAGE_NAMES.has(name)) result[name] = range;
    }
  }
  return result;
}

function stableObject(value) {
  return Object.fromEntries(Object.entries(object(value)).sort(([left], [right]) => left.localeCompare(right)));
}

export function collectRegistryReleaseIssues({
  manifest: manifestValue,
  sourcePackages: sourcePackagesValue,
  registryPackages: registryPackagesValue,
  requiredTags = []
}) {
  const manifest = object(manifestValue);
  const sourcePackages = object(sourcePackagesValue);
  const registryPackages = object(registryPackagesValue);
  const issues = [];

  if (manifest.releaseEligible !== true) issues.push("release manifest must be eligible");
  if (manifest.releaseVersion !== RELEASE_VERSION) {
    issues.push(`release manifest version must be ${RELEASE_VERSION}`);
  }

  const packages = Array.isArray(manifest.packages) ? manifest.packages : [];
  if (packages.length !== RELEASE_PACKAGE_NAMES.size) {
    issues.push(`release manifest must contain ${RELEASE_PACKAGE_NAMES.size} packages`);
  }

  for (const [index, manifestPackageValue] of packages.entries()) {
    const manifestPackage = object(manifestPackageValue);
    const name = manifestPackage.name;
    const sourcePackage = object(sourcePackages[name]);
    const registryPackage = object(registryPackages[name]);
    const label = name || `package ${index}`;

    if (!RELEASE_PACKAGE_NAMES.has(name)) issues.push(`${label} is not in the approved package set`);
    if (manifestPackage.publishIndex !== index) issues.push(`${label} has an invalid publish index`);
    if (manifestPackage.version !== RELEASE_VERSION) issues.push(`${label} manifest version is not ${RELEASE_VERSION}`);
    if (!registryPackages[name]) {
      issues.push(`${label} is not publicly readable from the registry`);
      continue;
    }
    if (registryPackage.public !== true) {
      issues.push(`${label} is not public`);
      continue;
    }
    if (registryPackage.name !== name || registryPackage.version !== manifestPackage.version) {
      issues.push(`${label} registry identity/version does not match the manifest`);
    }
    if (!manifestPackage.integrity || registryPackage.integrity !== manifestPackage.integrity) {
      issues.push(`${label} registry integrity does not match the approved tarball`);
    }
    if (!sourcePackage.license || registryPackage.license !== sourcePackage.license) {
      issues.push(`${label} registry license does not match the approved source manifest`);
    }
    if (!repositoryUrl(sourcePackage.repository)
      || repositoryUrl(registryPackage.repository) !== repositoryUrl(sourcePackage.repository)) {
      issues.push(`${label} registry repository does not match the approved source manifest`);
    }
    if (!sourcePackage.homepage || registryPackage.homepage !== sourcePackage.homepage) {
      issues.push(`${label} registry homepage does not match the approved source manifest`);
    }
    if (JSON.stringify(stableObject(registryPackage.peerDependencies))
      !== JSON.stringify(stableObject(sourcePackage.peerDependencies))) {
      issues.push(`${label} registry peer dependencies do not match the approved source manifest`);
    }

    const sourceInternal = internalDependencies(sourcePackage);
    const registryInternal = internalDependencies(registryPackage);
    const internalNames = new Set([...Object.keys(sourceInternal), ...Object.keys(registryInternal)]);
    for (const dependencyName of internalNames) {
      if (registryInternal[dependencyName] !== RELEASE_VERSION) {
        issues.push(`${label} registry dependency ${dependencyName} must be exact ${RELEASE_VERSION}`);
      }
    }

    const distTags = object(registryPackage.distTags);
    for (const tag of requiredTags) {
      if (distTags[tag] !== RELEASE_VERSION) {
        issues.push(`${label} ${tag} dist-tag must point to ${RELEASE_VERSION}`);
      }
    }
    if (registryPackage.provenancePredicateType !== PROVENANCE_PREDICATE) {
      issues.push(`${label} registry provenance is missing or invalid`);
    }
  }

  const manifestNames = new Set(packages.map((entry) => entry?.name));
  for (const name of RELEASE_PACKAGE_NAMES) {
    if (!manifestNames.has(name)) issues.push(`release manifest is missing ${name}`);
  }
  return issues;
}

