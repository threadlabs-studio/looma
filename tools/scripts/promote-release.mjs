import { spawnSync } from "node:child_process";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyPromotionLedgerCheckpoint,
  collectRegistryReleaseIssues,
  createPromotionLedger,
  executePromotionPlan,
  promotionOperations,
} from "./registry-release.mjs";
import { argumentValue } from "./publish-release.mjs";
import { promotionEvidenceFromEnvironment } from "./release-dispatch.mjs";
import {
  assertPathInsideRepository,
  fetchRegistryRelease,
  loadApprovedRelease,
  registryEvidence
} from "./verify-registry-release.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");
const registry = "https://registry.npmjs.org/";

function run(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env
  });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed\n${result.stderr ?? ""}`);
  }
  return result;
}

function applyPromotion(operation) {
  run("npm", [
    "dist-tag",
    "add",
    `${operation.name}@${operation.version}`,
    operation.tag,
    "--registry",
    registry
  ]);
}

function applyRollback(operation) {
  const args = operation.action === "restore"
    ? ["dist-tag", "add", `${operation.name}@${operation.version}`, operation.tag]
    : ["dist-tag", "rm", operation.name, operation.tag];
  return run("npm", [...args, "--registry", registry], { allowFailure: true });
}

async function waitForRegistry(approvedRelease, attempts = 12) {
  let latestState;
  let latestIssues = [];
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    latestState = await fetchRegistryRelease(approvedRelease);
    latestIssues = collectRegistryReleaseIssues({
      ...latestState,
      requiredTags: ["candidate", "latest"]
    });
    if (latestIssues.length === 0) return { state: latestState, issues: latestIssues };
    if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return { state: latestState, issues: latestIssues };
}

async function writePromotionLedger(outputPath, ledger) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(ledger, null, 2)}\n`, {
    encoding: "utf8",
    flush: true
  });
  await rename(temporaryPath, outputPath);
}

async function main() {
  const execute = process.argv.includes("--execute");
  const promotionEvidence = execute
    ? promotionEvidenceFromEnvironment()
    : null;
  const manifestPath = path.resolve(
    repoRoot,
    argumentValue("--manifest", ".release/artifacts/release-manifest.json")
  );
  const outputPath = path.resolve(
    repoRoot,
    argumentValue("--output", ".release/evidence/registry-promotion.json")
  );
  assertPathInsideRepository(manifestPath, "release manifest");
  assertPathInsideRepository(outputPath, "promotion evidence output");

  const approvedRelease = await loadApprovedRelease({ manifestPath });
  const before = await fetchRegistryRelease(approvedRelease);
  const candidateIssues = collectRegistryReleaseIssues({ ...before, requiredTags: ["candidate"] });
  if (candidateIssues.length > 0) {
    throw new Error(`candidate verification failed before promotion:\n- ${candidateIssues.join("\n- ")}`);
  }
  const operations = promotionOperations(before.manifest, before.registryPackages);
  if (!execute) {
    for (const operation of operations) {
      process.stdout.write(`Would point ${operation.name}@${operation.version} latest (previous: ${operation.previousLatest ?? "absent"})\n`);
    }
    if (operations.length === 0) process.stdout.write("All latest tags already match the approved release.\n");
    return;
  }
  if (process.env.LOOMA_RELEASE_PROMOTE !== "approved") {
    throw new Error("execution requires LOOMA_RELEASE_PROMOTE=approved from the protected environment");
  }

  const checkoutCommit = run("git", ["rev-parse", "HEAD"]).stdout.trim();
  if (checkoutCommit !== before.manifest.sourceCommit) {
    throw new Error(`manifest source ${before.manifest.sourceCommit} does not match checkout ${checkoutCommit}`);
  }
  run("npm", ["whoami", "--registry", registry]);

  const tagSnapshot = Object.fromEntries(before.manifest.packages.map((releasePackage) => [
    releasePackage.name,
    before.registryPackages[releasePackage.name]?.distTags ?? {}
  ]));
  let promotionLedger = createPromotionLedger({
    manifest: before.manifest,
    manifestPath: path.relative(repoRoot, manifestPath),
    tagSnapshot,
    operations,
    promotionEvidence,
    now: new Date().toISOString()
  });
  await writePromotionLedger(outputPath, promotionLedger);

  await executePromotionPlan({
    operations,
    promote: async (operation) => applyPromotion(operation),
    verify: async () => {
      const { state, issues } = await waitForRegistry(approvedRelease);
      if (issues.length > 0) {
        throw new Error(`post-promotion verification failed:\n- ${issues.join("\n- ")}`);
      }
      return state;
    },
    rollback: async (operation) => {
      const result = applyRollback(operation);
      if (result.status !== 0) throw new Error(result.stderr?.trim() || "rollback command failed");
    },
    verifyRollback: async (attempted) => {
      let failures = [];
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const restored = await fetchRegistryRelease(approvedRelease);
        failures = [
          ...attempted.filter((operation) =>
            (restored.registryPackages[operation.name]?.distTags?.latest ?? null) !== operation.previousLatest
          ).map((operation) => `${operation.name}: latest did not return to the recorded snapshot`),
          ...collectRegistryReleaseIssues({ ...restored, requiredTags: ["candidate"] })
        ];
        if (failures.length === 0) break;
        if (attempt < 11) await new Promise((resolve) => setTimeout(resolve, 500));
      }
      return failures;
    },
    onCheckpoint: async (checkpoint) => {
      const ledgerCheckpoint = checkpoint.type === "promotion-verification-succeeded"
        ? {
            type: checkpoint.type,
            verification: registryEvidence({
              manifest: checkpoint.result.manifest,
              registryPackages: checkpoint.result.registryPackages,
              requiredTags: ["candidate", "latest"]
            })
          }
        : checkpoint;
      promotionLedger = applyPromotionLedgerCheckpoint(
        promotionLedger,
        ledgerCheckpoint,
        new Date().toISOString()
      );
      await writePromotionLedger(outputPath, promotionLedger);
    }
  });
  process.stdout.write(`Promoted and verified ${before.manifest.releaseVersion} as latest for all ${before.manifest.packages.length} Looma packages.\n`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
