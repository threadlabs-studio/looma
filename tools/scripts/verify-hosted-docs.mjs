import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");

const KEY_ROUTES = [
  { path: "", label: "/", requiredText: ["Getting Started"] },
  {
    path: "release-1-support/",
    label: "/release-1-support/",
    requiredText: ["Release 1 Support and Limitations"]
  },
  {
    path: "components/ui-context-menu/",
    label: "/components/ui-context-menu/",
    requiredText: ["Context Menu"]
  }
];

const STALE_PUBLICATION_WORDING = [
  /not published yet/i,
  /publication pending/i,
  /become usable when (?:the )?Candidate is published/i,
  /publication remains blocked/i,
  /not a package that is already available/i,
  /do not depend on an unpublished registry package/i
];

function argumentValue(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  assert(["http:", "https:"].includes(url.protocol), "hosted docs URL must use HTTP or HTTPS");
  assert(!url.username && !url.password, "hosted docs URL must not contain credentials");
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/`;
  url.search = "";
  url.hash = "";
  return url;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function visibleText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function hasNoindex(html) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)].some(([tag]) =>
    /\bname\s*=\s*["']robots["']/i.test(tag)
      && /\bcontent\s*=\s*["'][^"']*noindex/i.test(tag)
  );
}

export function validateReleaseManifest(manifest, checkoutCommit) {
  assert(manifest && typeof manifest === "object", "release manifest must be an object");
  assert(
    typeof manifest.sourceCommit === "string" && /^[a-f0-9]{40}$/i.test(manifest.sourceCommit),
    "release manifest source commit must be a 40-character Git SHA"
  );
  if (checkoutCommit) {
    assert(
      manifest.sourceCommit === checkoutCommit,
      `release manifest source commit ${manifest.sourceCommit} does not match checkout ${checkoutCommit}`
    );
  }
  assert(
    typeof manifest.releaseVersion === "string" && manifest.releaseVersion.length > 0,
    "release manifest must name a release version"
  );
  assert(Array.isArray(manifest.packages) && manifest.packages.length > 0, "release manifest has no packages");

  const names = new Set();
  for (const releasePackage of manifest.packages) {
    assert(
      typeof releasePackage?.name === "string" && releasePackage.name.length > 0,
      "release manifest contains a package without a name"
    );
    assert(!names.has(releasePackage.name), `release manifest repeats package ${releasePackage.name}`);
    names.add(releasePackage.name);
    assert(
      releasePackage.version === manifest.releaseVersion,
      `${releasePackage.name} version ${releasePackage.version} differs from release ${manifest.releaseVersion}`
    );
  }

  return manifest.packages.map(({ name, version }) => ({ name, version }));
}

export function validateCandidateRegistryEvidence(manifest, evidence) {
  assert(evidence && typeof evidence === "object", "Candidate registry evidence must be an object");
  assert(
    evidence.registry === "https://registry.npmjs.org/",
    "Candidate registry evidence must describe the public npm registry"
  );
  assert(
    evidence.sourceCommit === manifest.sourceCommit,
    "Candidate registry evidence source commit differs from the release manifest"
  );
  assert(
    evidence.releaseVersion === manifest.releaseVersion,
    "Candidate registry evidence version differs from the release manifest"
  );
  assert(
    Array.isArray(evidence.requiredTags) && evidence.requiredTags.includes("candidate"),
    "Candidate registry evidence does not require the candidate tag"
  );
  assert(Array.isArray(evidence.packages), "Candidate registry evidence has no package list");

  const evidencePackages = new Map(evidence.packages.map((entry) => [entry?.name, entry]));
  assert(
    evidencePackages.size === manifest.packages.length,
    "Candidate registry evidence package set differs from the release manifest"
  );
  for (const releasePackage of manifest.packages) {
    const registryPackage = evidencePackages.get(releasePackage.name);
    assert(registryPackage, `Candidate registry evidence is missing ${releasePackage.name}`);
    assert(
      registryPackage.version === releasePackage.version,
      `Candidate registry evidence version differs for ${releasePackage.name}`
    );
    assert(
      registryPackage.distTags?.candidate === releasePackage.version,
      `Candidate registry evidence does not bind ${releasePackage.name} to the candidate tag`
    );
    assert(
      typeof registryPackage.integrity === "string" && registryPackage.integrity.length > 0,
      `Candidate registry evidence has no integrity for ${releasePackage.name}`
    );
  }
}

function routeIssues({ route, html, packages, releaseVersion }) {
  const text = visibleText(html);
  const issues = [];
  if (hasNoindex(html)) issues.push(`${route.label} contains a noindex robots directive`);
  for (const pattern of STALE_PUBLICATION_WORDING) {
    if (pattern.test(text)) {
      issues.push(`${route.label} contains stale publication wording matching ${pattern}`);
    }
  }
  for (const requiredText of route.requiredText) {
    if (!text.includes(requiredText)) issues.push(`${route.label} is missing ${requiredText}`);
  }
  if (route.label === "/" || route.label === "/release-1-support/") {
    if (!text.includes(releaseVersion)) {
      issues.push(`${route.label} is missing release version ${releaseVersion}`);
    }
    for (const releasePackage of packages) {
      if (!text.includes(releasePackage.name)) {
        issues.push(`${route.label} is missing release package ${releasePackage.name}`);
      }
    }
  }
  return issues;
}

async function fetchRoutes({ baseUrl, fetchImpl }) {
  return Promise.all(KEY_ROUTES.map(async (route) => {
    const url = new URL(route.path, baseUrl);
    const response = await fetchImpl(url, {
      redirect: "follow",
      cache: "no-store",
      headers: { "cache-control": "no-cache" }
    });
    const html = await response.text();
    return {
      route,
      url: url.href,
      finalUrl: response.url || url.href,
      status: response.status,
      html,
      sha256: sha256(html)
    };
  }));
}

export async function verifyHostedDocs({
  baseUrl,
  manifest,
  manifestPath = null,
  manifestSha256 = null,
  checkoutCommit = null,
  registryEvidence = null,
  registryEvidencePath = null,
  registryEvidenceSha256 = null,
  workflowRunUrl = null,
  requireHttps = false,
  attempts = 10,
  retryDelayMs = 3_000,
  fetchImpl = fetch
}) {
  const packages = validateReleaseManifest(manifest, checkoutCommit);
  if (registryEvidence) validateCandidateRegistryEvidence(manifest, registryEvidence);
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  if (requireHttps) assert(normalizedBaseUrl.protocol === "https:", "hosted docs URL must use HTTPS");
  let lastIssues = [];

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const responses = await fetchRoutes({ baseUrl: normalizedBaseUrl, fetchImpl });
      const issues = responses.flatMap((response) => {
        const finalUrl = new URL(response.finalUrl);
        if (finalUrl.username || finalUrl.password) {
          return [`${response.route.label} redirected to a URL containing credentials`];
        }
        if (finalUrl.origin !== normalizedBaseUrl.origin) {
          return [`${response.route.label} redirected away from ${normalizedBaseUrl.origin}`];
        }
        if (requireHttps && finalUrl.protocol !== "https:") {
          return [`${response.route.label} final URL does not use HTTPS`];
        }
        if (response.status !== 200) {
          return [`${response.route.label} returned HTTP ${response.status}`];
        }
        return routeIssues({
          route: response.route,
          html: response.html,
          packages,
          releaseVersion: manifest.releaseVersion
        });
      });
      if (issues.length === 0) {
        return {
          schemaVersion: 1,
          verifiedAt: new Date().toISOString(),
          result: "passed",
          hostedDocsUrl: normalizedBaseUrl.href,
          workflowRunUrl,
          manifestPath,
          manifestSha256,
          candidateRegistryEvidence: registryEvidencePath ? {
            path: registryEvidencePath,
            sha256: registryEvidenceSha256
          } : null,
          sourceCommit: manifest.sourceCommit,
          releaseVersion: manifest.releaseVersion,
          packages,
          routes: responses.map(({ route, url, finalUrl, status, sha256: contentSha256 }) => ({
            path: route.label,
            url,
            finalUrl,
            status,
            noindex: false,
            sha256: contentSha256
          }))
        };
      }
      lastIssues = issues;
    } catch (error) {
      lastIssues = [error instanceof Error ? error.message : String(error)];
    }

    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  throw new Error(`hosted docs verification failed:\n- ${lastIssues.join("\n- ")}`);
}

function checkoutCommit() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) throw new Error("could not resolve checkout commit");
  return result.stdout.trim();
}

async function writeJson(outputPath, value) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  const manifestPath = path.resolve(
    repoRoot,
    argumentValue("--manifest", ".release/artifacts/release-manifest.json")
  );
  const outputPath = path.resolve(
    repoRoot,
    argumentValue("--output", ".release/evidence/hosted-docs.json")
  );
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const manifestBytes = await readFile(manifestPath);
  const expectedCheckout = argumentValue("--checkout-commit", checkoutCommit());
  const packages = validateReleaseManifest(manifest, expectedCheckout);
  const registryEvidenceArgument = argumentValue("--registry-evidence");
  const registryEvidencePath = registryEvidenceArgument
    ? path.resolve(repoRoot, registryEvidenceArgument)
    : null;
  const registryEvidenceBytes = registryEvidencePath ? await readFile(registryEvidencePath) : null;
  const registryEvidence = registryEvidenceBytes
    ? JSON.parse(registryEvidenceBytes.toString("utf8"))
    : null;
  if (registryEvidence) validateCandidateRegistryEvidence(manifest, registryEvidence);

  if (process.argv.includes("--manifest-only")) {
    process.stdout.write(
      `Verified release manifest source ${manifest.sourceCommit} and ${packages.length} package identities.\n`
    );
    return;
  }

  const baseUrl = argumentValue("--base-url");
  assert(baseUrl, "--base-url is required");
  try {
    const evidence = await verifyHostedDocs({
      baseUrl,
      manifest,
      manifestPath: path.relative(repoRoot, manifestPath),
      manifestSha256: sha256(manifestBytes),
      checkoutCommit: expectedCheckout,
      registryEvidence,
      registryEvidencePath: registryEvidencePath ? path.relative(repoRoot, registryEvidencePath) : null,
      registryEvidenceSha256: registryEvidenceBytes ? sha256(registryEvidenceBytes) : null,
      workflowRunUrl: argumentValue("--workflow-run-url"),
      requireHttps: true,
      attempts: Number.parseInt(argumentValue("--attempts", "20"), 10),
      retryDelayMs: Number.parseInt(argumentValue("--retry-delay-ms", "3000"), 10)
    });
    await writeJson(outputPath, evidence);
    process.stdout.write(
      `Verified ${evidence.routes.length} hosted Candidate docs routes for ${evidence.packages.length} manifest packages at ${evidence.hostedDocsUrl}\nEvidence: ${path.relative(repoRoot, outputPath)}\n`
    );
  } catch (error) {
    await writeJson(outputPath, {
      schemaVersion: 1,
      verifiedAt: new Date().toISOString(),
      result: "failed",
      hostedDocsUrl: baseUrl,
      workflowRunUrl: argumentValue("--workflow-run-url"),
      manifestPath: path.relative(repoRoot, manifestPath),
      manifestSha256: sha256(manifestBytes),
      candidateRegistryEvidence: registryEvidencePath ? {
        path: path.relative(repoRoot, registryEvidencePath),
        sha256: registryEvidenceBytes ? sha256(registryEvidenceBytes) : null
      } : null,
      sourceCommit: manifest.sourceCommit,
      releaseVersion: manifest.releaseVersion,
      packages,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
