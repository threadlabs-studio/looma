import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Bootstrap receipts from actual completed executions, never from green aggregate checks alone.
export const stages = {
  quality: {
    workflow: ".github/workflows/ci.yml",
    steps: ["Setup pnpm", "Setup Node", "Install dependencies", "Install Chromium", "Check code documentation", "Check component formatting", "Build", "Lint", "Typecheck", "Test", "Test in a browser"]
  },
  "release-package": {
    workflow: ".github/workflows/ci.yml",
    steps: ["Setup pnpm", "Setup Node", "Use release npm CLI", "Install dependencies", "Verify release packaging"]
  },
  "docs-parity": {
    workflow: ".github/workflows/docs-parity.yml",
    steps: ["Install pinned pnpm dependencies", "Build documentation", "Check route and example coverage", "Check behavior in three browsers", "Compare reviewed visuals"]
  }
};

export function fingerprint(entries, stage) {
  const excluded = new Set([
    ".github/workflows/ci.yml", ".github/workflows/docs-parity.yml",
    "tools/scripts/reuse-stage-proof.mjs", "tools/scripts/reuse-stage-proof.test.mjs"
  ]);
  const inputs = entries.filter(({ path, type }) => type !== "tree" && !excluded.has(path) &&
    !(stage === "docs-parity" && path.startsWith("packages/looma/tests/")));
  return createHash("sha256").update(inputs.map(({ path, mode, type, sha }) =>
    `${mode} ${type} ${sha}\t${path}`).sort().join("\n")).digest("hex");
}

export function checkoutRevision(log) {
  const matches = [...log.matchAll(/git log -1 --format=%H\r?\n[^\n]*?\s([a-f0-9]{40})\r?\n/g)];
  if (matches.length !== 1) throw new Error("Provider logs must identify one actual checkout revision");
  return matches[0][1];
}

function jobSource(workflow, stage) {
  const source = workflow.match(new RegExp(`\\n  ${stage}:\\n[\\s\\S]*?(?=\\n  [\\w-]+:\\n|$)`))?.[0];
  if (!source) throw new Error(`Missing ${stage} workflow job`);
  return source;
}

export function validateProvider({ repository, stage, run, job, commit, log, currentWorkflow, providerWorkflow, packageManager, imageOS, imageVersion }) {
  const require = (condition, message) => { if (!condition) throw new Error(message); };
  const policy = stages[stage];
  require(Boolean(policy), "Unknown proof stage");
  require(run.repository?.full_name === repository && run.head_repository?.full_name === repository, "Provider must belong to this repository");
  require(run.status === "completed" && run.conclusion === "success" && run.path === policy.workflow, "Provider workflow did not finish successfully");
  require(job.run_id === run.id && job.run_attempt === run.run_attempt && job.head_sha === run.head_sha && job.name === stage && job.status === "completed" && job.conclusion === "success", "Provider stage identity or conclusion differs");
  for (const name of policy.steps) {
    const steps = job.steps.filter((step) => step.name === name);
    require(steps.length === 1 && steps[0].status === "completed" && steps[0].conclusion === "success", `Provider did not execute ${name} successfully`);
  }
  const checkout = checkoutRevision(log);
  require(commit.sha === checkout, "Provider commit differs from actual checkout");
  if (run.event === "pull_request") {
    require(run.pull_requests?.length === 1, "Provider PR identity is ambiguous");
    const pr = run.pull_requests[0];
    // The PR entry follows its latest head; run.head_sha retains the revision of this execution.
    require(pr.head.repo.id === run.repository.id && pr.base.repo.id === run.repository.id, "Provider PR source is not trusted");
    require(commit.parents.length === 2 && commit.parents.some(({ sha }) => sha === run.head_sha) && commit.parents.some(({ sha }) => sha === pr.base.sha), "Actual tested merge does not retain the provider head and base");
  } else {
    require(run.event === "push" && checkout === run.head_sha, "Unsupported provider checkout event");
  }
  const current = jobSource(currentWorkflow, stage);
  const provider = jobSource(providerWorkflow, stage);
  const runner = (text) => text.match(/runs-on:\s*([^\n]+)/)?.[1].trim();
  require(runner(current) === runner(provider) && job.labels.includes(runner(current)), "Provider runner differs");
  const image = log.match(/##\[group\]Runner Image\r?\n[^\n]*Image:\s*(\S+)\r?\n[^\n]*Version:\s*(\S+)/);
  // Container stages bind the immutable execution image below; host image env is not
  // forwarded into job containers. Native stages bind the hosted image version too.
  require(image && (stage === "docs-parity" ? image[1] === runner(current) : image[1] === imageOS && image[2] === imageVersion), "Provider runner image version differs");
  const actions = (text) => [...text.matchAll(/uses:\s*([^\s#]+)/g)].map((match) => match[1]).sort();
  require(JSON.stringify(actions(current)) === JSON.stringify(actions(provider)), "Provider action pins differ");
  // The orchestration files are excluded from the input digest, so bind their actual commands.
  for (const name of policy.steps) {
    const step = (text) => text.match(new RegExp(`- name: ${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n[\\s\\S]*?(?=\\n      - |$)`))?.[0];
    const command = (text) => step(text)?.match(/\n\s+run:\s*([^\n]+)/)?.[1];
    require(step(current) && step(provider) && command(current) === command(provider), `Provider command changed: ${name}`);
  }
  const pnpmVersion = packageManager.match(/^pnpm@([\d.]+)$/)?.[1];
  require(pnpmVersion && log.includes(`using pnpm v${pnpmVersion}`), "Provider pnpm runtime differs");
  if (stage === "docs-parity") {
    const container = (text) => text.match(/image:\s*(\S+)/)?.[1];
    require(container(current) === container(provider) && container(current)?.includes("@sha256:") && log.includes(`Digest: ${container(current).split("@")[1]}`), "Provider browser container differs");
    require(current.includes('LOOMA_DOCS_CANONICAL: "1"') && provider.includes('LOOMA_DOCS_CANONICAL: "1"'), "Canonical visual environment differs");
  } else {
    const node = log.match(/\bnode: v([\d.]+)/)?.[1];
    const version = (text) => text.match(/node-version:\s*([\d.]+)/)?.[1];
    require(node === version(current) && (version(provider) === node || version(provider) === node?.split(".")[0]), "Provider Node runtime differs");
    if (stage === "release-package") require(current.includes("npm@11.5.1") && provider.includes("npm@11.5.1"), "Provider release npm version differs");
  }
  return checkout;
}

async function main() {
  const args = process.argv.slice(2);
  const stage = args[args.indexOf("--stage") + 1];
  const runId = args[args.indexOf("--run-id") + 1];
  if (!stages[stage] || !/^\d+$/.test(runId)) throw new Error("Expected --stage and --run-id");
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository || !process.env.GITHUB_TOKEN) throw new Error("Repository and read-only GitHub token are required");
  const api = async (path, raw = false) => {
    const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
      headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }
    });
    if (!response.ok) throw new Error(`Provider API ${path}: ${response.status}`);
    return raw ? response.text() : response.json();
  };
  const run = await api(`actions/runs/${runId}`);
  const jobs = await api(`actions/runs/${runId}/attempts/${run.run_attempt}/jobs?per_page=100`);
  const job = jobs.jobs.find((entry) => entry.name === stage);
  if (!job) throw new Error(`Missing provider stage ${stage}`);
  const log = await api(`actions/jobs/${job.id}/logs`, true);
  const commit = await api(`git/commits/${checkoutRevision(log)}`);
  const providerTree = await api(`git/trees/${commit.tree.sha}?recursive=1`);
  if (providerTree.truncated) throw new Error("Provider tree is incomplete");
  const workflowBlob = providerTree.tree.find(({ path }) => path === stages[stage].workflow);
  const blob = await api(`git/blobs/${workflowBlob.sha}`);
  const providerWorkflow = Buffer.from(blob.content, "base64").toString("utf8");
  const currentWorkflow = readFileSync(stages[stage].workflow, "utf8");
  // Hosted image environment uses ubuntu24; the execution log names ubuntu-24.04.
  let imageOS = process.env.ImageOS?.replace(/^ubuntu(\d{2})(?:-arm)?$/, "ubuntu-$1.04");
  if (stage === "docs-parity" && imageOS && !imageOS.endsWith("-arm")) imageOS += "-arm";
  const checkout = validateProvider({ repository, stage, run, job, commit, log, currentWorkflow, providerWorkflow,
    packageManager: JSON.parse(readFileSync("package.json", "utf8")).packageManager,
    imageOS, imageVersion: process.env.ImageVersion });
  const localEntries = execFileSync("git", ["-c", `safe.directory=${process.cwd()}`, "ls-tree", "-r", "-z", "HEAD"], { encoding: "utf8" }).split("\0").filter(Boolean).map((entry) => {
    const [, mode, type, sha, path] = entry.match(/^(\d+) (\w+) ([a-f0-9]+)\t([\s\S]+)$/);
    return { mode, type, sha, path };
  });
  const digest = fingerprint(localEntries, stage);
  if (digest !== fingerprint(providerTree.tree, stage)) throw new Error("Stage inputs changed; selected qualification is required (no full-suite fallback)");
  const receipt = { stage, provider: run.html_url, attempt: run.run_attempt, checkout, fingerprint: digest };
  console.log(JSON.stringify(receipt, null, 2));
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, "reused=true\n");
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Validated executed **${stage}** proof from [run ${runId}](${run.html_url}), attempt ${run.run_attempt}.\n\nTested checkout: \`${checkout}\`\n\nMatching input fingerprint: \`${digest}\`\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
