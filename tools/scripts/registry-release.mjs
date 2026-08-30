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

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function createPromotionLedger({ manifest: manifestValue, manifestPath, tagSnapshot, operations, now }) {
  const manifest = object(manifestValue);
  return {
    schemaVersion: 1,
    evidenceType: "registry-promotion-ledger",
    status: "planned",
    state: "promotion-planned",
    createdAt: now,
    updatedAt: now,
    sourceCommit: manifest.sourceCommit,
    releaseVersion: manifest.releaseVersion,
    approvals: structuredClone(object(manifest.approvals)),
    releaseManifest: {
      path: manifestPath,
      schemaVersion: manifest.schemaVersion,
      createdAt: manifest.createdAt ?? null,
      evidence: structuredClone(object(manifest.evidence)),
      packages: structuredClone(Array.isArray(manifest.packages) ? manifest.packages : [])
    },
    tagSnapshot: structuredClone(tagSnapshot),
    plannedOperations: structuredClone(operations),
    changedPackages: operations.map((operation) => operation.name),
    promotedAt: null,
    operationStates: operations.map((operation) => ({
      ...structuredClone(operation),
      status: "planned"
    })),
    rollback: {
      status: "not-required",
      operations: [],
      verification: null
    },
    failure: null,
    verification: null,
    checkpoints: [{ type: "ledger-created", at: now }]
  };
}

function promotionOperationState(ledger, operation) {
  return ledger.operationStates.find((entry) =>
    entry.name === operation.name
      && entry.version === operation.version
      && entry.tag === operation.tag
  );
}

function rollbackOperationState(ledger, operation) {
  return ledger.rollback.operations.findLast((entry) =>
    entry.name === operation.name
      && entry.tag === operation.tag
      && entry.action === operation.action
  );
}

export function applyPromotionLedgerCheckpoint(ledgerValue, checkpointValue, at) {
  const ledger = structuredClone(ledgerValue);
  const checkpoint = object(checkpointValue);
  const operation = checkpoint.operation ? structuredClone(checkpoint.operation) : null;
  const record = { type: checkpoint.type, at };
  if (operation) record.operation = operation;
  if (checkpoint.error) record.error = checkpoint.error;
  if (Array.isArray(checkpoint.failures)) record.failures = structuredClone(checkpoint.failures);
  ledger.updatedAt = at;
  ledger.checkpoints.push(record);

  switch (checkpoint.type) {
    case "promotion-operation-attempted": {
      ledger.status = "in-progress";
      ledger.state = "promoting";
      const state = promotionOperationState(ledger, operation);
      if (state) Object.assign(state, { status: "attempted", attemptedAt: at });
      break;
    }
    case "promotion-operation-applied": {
      const state = promotionOperationState(ledger, operation);
      if (state) Object.assign(state, { status: "applied", appliedAt: at });
      break;
    }
    case "promotion-verification-attempted":
      ledger.state = "verifying-registry";
      break;
    case "promotion-verification-succeeded":
      ledger.status = "succeeded";
      ledger.state = "registry-verified";
      ledger.promotedAt = at;
      ledger.verification = structuredClone(checkpoint.verification);
      break;
    case "promotion-verification-failed":
      ledger.state = "registry-verification-failed";
      ledger.failure = checkpoint.error;
      break;
    case "promotion-failed":
      ledger.status = "recovering";
      ledger.state = "rollback-in-progress";
      ledger.failure = checkpoint.error;
      ledger.rollback.status = "in-progress";
      break;
    case "rollback-operation-attempted":
      ledger.rollback.operations.push({
        ...operation,
        status: "attempted",
        attemptedAt: at
      });
      break;
    case "rollback-operation-applied": {
      const state = rollbackOperationState(ledger, operation);
      if (state) Object.assign(state, { status: "applied", appliedAt: at });
      break;
    }
    case "rollback-operation-failed": {
      const state = rollbackOperationState(ledger, operation);
      if (state) Object.assign(state, { status: "failed", failedAt: at, error: checkpoint.error });
      break;
    }
    case "rollback-verification-attempted":
      ledger.rollback.status = "verifying";
      break;
    case "rollback-verification-succeeded":
      ledger.status = "rolled-back";
      ledger.state = "tag-snapshot-restored";
      ledger.rollback.status = "verified";
      ledger.rollback.verification = { verifiedAt: at, failures: [] };
      break;
    case "rollback-verification-failed":
      ledger.status = "rollback-failed";
      ledger.state = "manual-recovery-required";
      ledger.rollback.status = "failed";
      ledger.rollback.verification = {
        verifiedAt: at,
        failures: structuredClone(checkpoint.failures ?? [])
      };
      break;
  }
  return ledger;
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

export function promotionOperations(manifestValue, registryPackagesValue) {
  const manifest = object(manifestValue);
  const registryPackages = object(registryPackagesValue);
  const packages = Array.isArray(manifest.packages) ? manifest.packages : [];
  const operations = [];
  for (const manifestPackage of packages) {
    const registryPackage = object(registryPackages[manifestPackage.name]);
    const previousLatest = object(registryPackage.distTags).latest ?? null;
    if (previousLatest === manifestPackage.version) continue;
    operations.push({
      name: manifestPackage.name,
      version: manifestPackage.version,
      tag: "latest",
      previousLatest
    });
  }
  return operations;
}

export function rollbackOperations(appliedOperations) {
  return [...appliedOperations].reverse().map((operation) => operation.previousLatest
    ? {
        action: "restore",
        name: operation.name,
        tag: operation.tag,
        version: operation.previousLatest
      }
    : {
        action: "remove",
        name: operation.name,
        tag: operation.tag
      });
}

export async function executePromotionPlan({
  operations,
  promote,
  verify,
  rollback,
  verifyRollback,
  onCheckpoint = async () => {}
}) {
  const attempted = [];
  const recoveryCheckpoint = async (checkpoint) => {
    try {
      await onCheckpoint(checkpoint);
    } catch {
      // Recovery must continue even if a later evidence checkpoint cannot be persisted.
    }
  };
  try {
    for (const operation of operations) {
      await onCheckpoint({ type: "promotion-operation-attempted", operation });
      attempted.push(operation);
      await promote(operation);
      await onCheckpoint({ type: "promotion-operation-applied", operation });
    }
    await onCheckpoint({ type: "promotion-verification-attempted" });
    let after;
    try {
      after = await verify();
    } catch (error) {
      await recoveryCheckpoint({ type: "promotion-verification-failed", error: errorMessage(error) });
      throw error;
    }
    await onCheckpoint({ type: "promotion-verification-succeeded", result: after });
    return { after, attempted };
  } catch (error) {
    await recoveryCheckpoint({ type: "promotion-failed", error: errorMessage(error) });
    const commandFailures = [];
    for (const operation of rollbackOperations(attempted)) {
      await recoveryCheckpoint({ type: "rollback-operation-attempted", operation });
      try {
        await rollback(operation);
        await recoveryCheckpoint({ type: "rollback-operation-applied", operation });
      } catch (rollbackError) {
        commandFailures.push(operation.name);
        await recoveryCheckpoint({
          type: "rollback-operation-failed",
          operation,
          error: errorMessage(rollbackError)
        });
      }
    }
    let stateFailures;
    await recoveryCheckpoint({ type: "rollback-verification-attempted" });
    try {
      stateFailures = await verifyRollback(attempted);
      await recoveryCheckpoint(stateFailures.length === 0
        ? { type: "rollback-verification-succeeded" }
        : { type: "rollback-verification-failed", failures: stateFailures });
    } catch (rollbackError) {
      stateFailures = [
        ...commandFailures.map((name) => `${name}: rollback command failed`),
        `rollback state could not be verified: ${errorMessage(rollbackError)}`
      ];
      await recoveryCheckpoint({ type: "rollback-verification-failed", failures: stateFailures });
    }
    const rollbackMessage = stateFailures.length === 0
      ? "Applied latest tags were restored to the recorded snapshot."
      : `Rollback failures require owner intervention:\n- ${stateFailures.join("\n- ")}`;
    throw new Error(`${errorMessage(error)}\n${rollbackMessage}`);
  }
}
