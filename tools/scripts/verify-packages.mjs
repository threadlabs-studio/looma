import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createReleaseManifest, sha256File } from "./create-release-manifest.mjs";
import { RELEASE_PACKAGE_NAMES, RELEASE_PACKAGES, RELEASE_VERSION } from "./release-config.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");
const canonicalRepository = "git+https://github.com/threadlabs-studio/looma.git";
const canonicalIssues = "https://github.com/threadlabs-studio/looma/issues";

function hasArgument(name) {
  return process.argv.includes(name);
}

function argumentValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    env: options.env ?? process.env,
    stdio: options.stdio ?? "pipe"
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed (${result.status})\n${result.stdout ?? ""}${result.stderr ?? ""}`
    );
  }
  return (result.stdout ?? "").trim();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function packageTarballName(packageJson) {
  const normalizedName = packageJson.name.replace(/^@/, "").replaceAll("/", "-");
  return `${normalizedName}-${packageJson.version}.tgz`;
}

function collectExportTargets(value, targets = []) {
  if (typeof value === "string") {
    targets.push(value);
    return targets;
  }
  if (value && typeof value === "object") {
    for (const nestedValue of Object.values(value)) {
      collectExportTargets(nestedValue, targets);
    }
  }
  return targets;
}

function validatePackedManifest(packageJson) {
  assert(RELEASE_PACKAGE_NAMES.has(packageJson.name), `unexpected release package ${packageJson.name}`);
  assert(packageJson.version === RELEASE_VERSION, `${packageJson.name} must be ${RELEASE_VERSION}`);
  assert(packageJson.repository?.url === canonicalRepository, `${packageJson.name} repository URL is not canonical`);
  assert(packageJson.bugs?.url === canonicalIssues, `${packageJson.name} issues URL is not canonical`);
  assert(typeof packageJson.homepage === "string" && packageJson.homepage.startsWith("https://"), `${packageJson.name} homepage is missing`);
  assert(packageJson.publishConfig?.access === "public", `${packageJson.name} is not configured for public access`);
  assert(packageJson.publishConfig?.provenance === true, `${packageJson.name} is not configured for provenance`);

  for (const field of ["dependencies", "optionalDependencies"]) {
    for (const [dependencyName, range] of Object.entries(packageJson[field] ?? {})) {
      if (RELEASE_PACKAGE_NAMES.has(dependencyName)) {
        assert(
          range === RELEASE_VERSION,
          `${packageJson.name} packed ${field}.${dependencyName} must be exact ${RELEASE_VERSION}, received ${range}`
        );
      }
    }
  }
}

function validateTarballContents(releasePackage, packageJson, entries, requireLicense) {
  const entrySet = new Set(entries);
  for (const requiredFile of releasePackage.requiredFiles) {
    assert(entrySet.has(requiredFile), `${packageJson.name} tarball is missing ${requiredFile}`);
  }
  if (requireLicense) {
    assert(entrySet.has("package/LICENSE"), `${packageJson.name} tarball is missing package/LICENSE`);
  }

  const forbiddenPatterns = [
    /(^|\/)\.env(?:\.|$)/,
    /(^|\/)\.git(?:\/|$)/,
    /(^|\/)node_modules(?:\/|$)/,
    /(^|\/)(?:test|tests|__tests__)(?:\/|$)/,
    /(^|\/)tsconfig(?:\.[^/]*)?\.json$/,
    /(^|\/)vitest(?:\.[^/]*)?\.config\.[^/]+$/,
    /(^|\/)src\/.*\.(?:ts|tsx)$/
  ];
  const forbiddenEntries = entries.filter((entry) =>
    forbiddenPatterns.some((pattern) => pattern.test(entry))
  );
  assert(
    forbiddenEntries.length === 0,
    `${packageJson.name} tarball includes forbidden files: ${forbiddenEntries.join(", ")}`
  );

  const declaredTargets = [
    ...collectExportTargets(packageJson.exports),
    packageJson.main,
    packageJson.module,
    packageJson.types
  ].filter(Boolean);
  for (const target of declaredTargets) {
    const entry = `package/${target.replace(/^\.\//, "")}`;
    assert(entrySet.has(entry), `${packageJson.name} export target is missing from tarball: ${target}`);
  }
}

async function validateLicenses(allowMissingLicense) {
  const rootLicensePath = path.join(repoRoot, "LICENSE");
  let rootLicense;
  try {
    rootLicense = await readFile(rootLicensePath);
  } catch {
    if (allowMissingLicense) {
      return { requireLicense: false, exceptions: ["Owner-approved license is missing"] };
    }
    throw new Error("Owner-approved root LICENSE is missing");
  }

  const exceptions = [];
  for (const releasePackage of RELEASE_PACKAGES) {
    const manifestPath = path.join(repoRoot, releasePackage.directory, "package.json");
    const packageJson = JSON.parse(await readFile(manifestPath, "utf8"));
    assert(
      typeof packageJson.license === "string" && packageJson.license !== "UNLICENSED",
      `${packageJson.name} must declare the approved SPDX license`
    );
    const packageLicense = await readFile(path.join(repoRoot, releasePackage.directory, "LICENSE"));
    assert(
      packageLicense.equals(rootLicense),
      `${packageJson.name} package-local LICENSE differs from the root LICENSE`
    );
  }
  return { requireLicense: true, exceptions };
}

async function cleanOutputDirectory(outputDirectory) {
  await mkdir(outputDirectory, { recursive: true });
  const entries = await readdir(outputDirectory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && (entry.name.endsWith(".tgz") || entry.name === "release-manifest.json")) {
      await rm(path.join(outputDirectory, entry.name));
    }
  }
}

async function main() {
  const allowDirty = hasArgument("--allow-dirty");
  const allowMissingLicense = hasArgument("--allow-missing-license");
  const allowMissingApprovals = hasArgument("--allow-missing-approvals");
  const outputArgument = argumentValue("--output-dir", ".release/artifacts");
  const outputDirectory = path.resolve(repoRoot, outputArgument);
  assert(outputDirectory !== repoRoot, "release output directory cannot be the repository root");
  assert(
    outputDirectory.startsWith(`${repoRoot}${path.sep}`),
    "release output directory must stay inside the repository"
  );

  const exceptions = [];
  const status = run("git", ["status", "--porcelain", "--untracked-files=all"]);
  if (status) {
    if (!allowDirty) {
      throw new Error(`release verification requires a clean tree:\n${status}`);
    }
    exceptions.push("Source tree was dirty during local inspection");
  }

  const licenseState = await validateLicenses(allowMissingLicense);
  exceptions.push(...licenseState.exceptions);
  const approvals = {
    npm: process.env.LOOMA_NPM_APPROVER ?? "",
    documentation: process.env.LOOMA_DOCS_APPROVER ?? "",
    knit: process.env.LOOMA_KNIT_APPROVER ?? ""
  };
  const missingApprovals = Object.entries(approvals)
    .filter(([, value]) => value.trim().length === 0)
    .map(([name]) => name);
  if (missingApprovals.length > 0) {
    if (!allowMissingApprovals) {
      throw new Error(`release approval owners are missing: ${missingApprovals.join(", ")}`);
    }
    exceptions.push(`Release approval owners are missing: ${missingApprovals.join(", ")}`);
  }
  await cleanOutputDirectory(outputDirectory);

  run("pnpm", ["build"], { stdio: "inherit" });

  const packedEntries = [];
  for (const releasePackage of RELEASE_PACKAGES) {
    const packageDirectory = path.join(repoRoot, releasePackage.directory);
    const sourcePackageJson = JSON.parse(
      await readFile(path.join(packageDirectory, "package.json"), "utf8")
    );
    assert(sourcePackageJson.name === releasePackage.name, `${releasePackage.directory} has wrong name`);
    assert(sourcePackageJson.version === RELEASE_VERSION, `${releasePackage.name} has wrong source version`);

    run(
      "pnpm",
      ["pack", "--pack-destination", outputDirectory],
      { cwd: packageDirectory }
    );
    const tarball = packageTarballName(sourcePackageJson);
    const tarballPath = path.join(outputDirectory, tarball);
    const tarEntries = run("tar", ["-tzf", tarballPath]).split("\n").filter(Boolean);
    const packedPackageJson = JSON.parse(
      run("tar", ["-xOzf", tarballPath, "package/package.json"])
    );

    validatePackedManifest(packedPackageJson);
    validateTarballContents(
      releasePackage,
      packedPackageJson,
      tarEntries,
      licenseState.requireLicense
    );
    for (const requiredFile of releasePackage.requiredFiles) {
      if (requiredFile === "package/package.json") {
        continue;
      }
      const content = run("tar", ["-xOzf", tarballPath, requiredFile]);
      assert(content.length > 0, `${packedPackageJson.name} tarball contains empty ${requiredFile}`);
    }

    const fileStats = await stat(tarballPath);
    packedEntries.push({
      packageJson: packedPackageJson,
      tarball,
      sha256: await sha256File(tarballPath),
      bytes: fileStats.size,
      tarEntries
    });
  }

  const sourceCommit = run("git", ["rev-parse", "HEAD"]);
  const manifest = createReleaseManifest({
    sourceCommit,
    nodeVersion: process.version,
    pnpmVersion: run("pnpm", ["--version"]),
    npmVersion: run("npm", ["--version"]),
    packages: packedEntries,
    releaseEligible: exceptions.length === 0,
    exceptions,
    approvals,
    evidence: {
      componentContract: "generated/component-api.json",
      releaseChecklist: "docs/release-checklist.md",
      workflowRun:
        process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
          ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
          : null,
      artifactDirectory: path.relative(repoRoot, outputDirectory)
    }
  });
  const manifestPath = path.join(outputDirectory, "release-manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  process.stdout.write(
    `Verified ${manifest.packages.length} tarballs in ${path.relative(repoRoot, outputDirectory)}\n`
  );
  process.stdout.write(`Publish order: ${manifest.packages.map((entry) => entry.name).join(" -> ")}\n`);
  process.stdout.write(`Release eligible: ${manifest.releaseEligible ? "yes" : "no"}\n`);
  if (exceptions.length > 0) {
    process.stdout.write(`Exceptions: ${exceptions.join("; ")}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
