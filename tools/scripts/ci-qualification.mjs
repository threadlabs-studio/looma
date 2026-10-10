import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { admitQualification, browserTestIds, caseNamePattern, checkoutRevision, fingerprint, isBrowserTest, selectChecks, stageInputs, stages, testCases, validateBrowserReport, validateCheckout, validateNodeReport, validateProvider, validateReceipt, validateVitestReport, vitestArguments, workflowPaths } from "./ci-selection.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const gitOwnership = ["-c", `safe.directory=${root}`];
const directory = path.join(root, ".qualification");
const legacyWorkflows = { ci: "19e4690a057127cf4eafb7c516c111adbe18c4d82263559cc8245c31eabd625b", docs: "f4e077101e415305d9143325ae4c0bdba838f5308f38dfd3a0d9bd1ec8bffda1" };
const legacySteps = { ci: { quality: ["Setup pnpm", "Setup Node", "Install dependencies", "Install Chromium", "Check code documentation", "Check component formatting", "Build", "Lint", "Typecheck", "Test", "Test in a browser"], "package-consumer": ["Setup pnpm", "Setup Node", "Use release npm CLI", "Install dependencies", "Verify release packaging"] },
  docs: { "docs-behavior": ["Install pinned pnpm dependencies", "Build documentation", "Check route and example coverage", "Check behavior in three browsers"], "docs-visual": ["Install pinned pnpm dependencies", "Build documentation", "Compare reviewed visuals"] } };
const git = (args, options = {}) => { const { raw, ...execution } = options; const result = execFileSync("git", [...gitOwnership, ...args], { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 ** 2, ...execution }); return raw ? result : result.trim(); };
const json = (file) => JSON.parse(readFileSync(path.join(directory, file), "utf8"));
const write = (file, value) => writeFileSync(path.join(directory, file), JSON.stringify(value) + "\n");
const run = (args, options = {}) => { const result = spawnSync("pnpm", args, { cwd: root, stdio: "inherit", env: process.env, ...options }); if (result.error) throw result.error; if (result.status !== 0) throw new Error(`Selected check failed: pnpm ${args.join(" ")}`); };
const api = async (endpoint, binary = false) => {
  const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/${endpoint}`, { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } });
  if (!response.ok) throw new Error(`Provider API ${endpoint}: ${response.status}`);
  return binary ? Buffer.from(await response.arrayBuffer()) : response.json();
};
const getRevision = (revision) => { if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error("Invalid provider revision"); if (spawnSync("git", [...gitOwnership, "cat-file", "-e", `${revision}^{commit}`], { cwd: root, stdio: "ignore" }).status !== 0) git(["fetch", "--no-tags", "origin", revision]); };
function validateRevision(provider, revision) {
  getRevision(revision);
  const parents = git(["rev-list", "--parents", "-n", "1", revision]).split(" ").slice(1);
  const retained = provider.event === "push" || spawnSync("git", [...gitOwnership, "merge-base", "--is-ancestor", parents[0], "origin/main"], { cwd: root }).status === 0;
  validateCheckout(provider, revision, parents, retained);
}
const snapshots = new Map();

/** Blob IDs avoid reading the visual baseline bytes; source reads are limited to dependency discovery. */
export function snapshot(revision, source = false) {
  const key = `${git(["rev-parse", revision])}:${source}`;
  if (snapshots.has(key)) return snapshots.get(key);
  const files = Object.fromEntries(git(["ls-tree", "-r", "-z", revision]).split("\0").filter(Boolean).map((entry) => {
    const match = /^(\d+) (\w+) ([a-f0-9]+)\t(.*)$/.exec(entry);
    if (!match || match[2] !== "blob") throw new Error("Qualification does not support submodules");
    return [match[4], `${match[1]}:${match[3]}`];
  }));
  if (!source) { snapshots.set(key, files); return files; }
  const needed = Object.keys(files).filter((file) => /^(?:packages\/looma\/(?:src|tests)\/|apps\/docs\/(?:docs\/|src\/|tests\/[^/]+\.(?:ts|json)$)|tools\/scripts\/)/.test(file) && /\.(?:html|tsx?|js|mjs|mdx?|json)$/.test(file));
  const batch = execFileSync("git", [...gitOwnership, "cat-file", "--batch"], { cwd: root, input: needed.map((file) => files[file].split(":")[1]).join("\n") + "\n", maxBuffer: 32 * 1024 ** 2 });
  let offset = 0;
  for (const file of needed) {
    const headerEnd = batch.indexOf(10, offset);
    const header = batch.subarray(offset, headerEnd).toString("utf8");
    const size = Number(/^[a-f0-9]+ blob (\d+)$/.exec(header)?.[1]);
    if (!Number.isSafeInteger(size)) throw new Error("Incomplete Git source batch");
    files[file] = batch.subarray(headerEnd + 1, headerEnd + 1 + size).toString("utf8");
    offset = headerEnd + 1 + size + 1;
  }
  snapshots.set(key, files);
  return files;
}
const browserImage = "mcr.microsoft.com/playwright:v1.60.0-noble@sha256:beddddcf96f19abec078cd2f3da676f40abd460e0e734ad5eed73627ce161d33";
const runtime = (workflow, stage) => workflow === "docs" ? browserImage : `linux-x64:node24.21.0:pnpm10.7.1:${stage === "package-consumer" ? "npm11.5.1:" : ""}${process.env.ImageOS}:${process.env.ImageVersion}`;
const hashes = (files, workflow) => Object.fromEntries(stages[workflow].map((stage) => [stage, fingerprint({ ...stageInputs(files, stage), "__runtime": runtime(workflow, stage) })]));
const contract = (files, workflow) => fingerprint(Object.fromEntries([workflowPaths[workflow], "tools/scripts/ci-selection.mjs", "tools/scripts/ci-qualification.mjs"].map((file) => [file, files[file]])));

function identity(workflow) {
  if (!stages[workflow]) throw new Error("Choose ci or docs qualification");
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const result = { repository: process.env.GITHUB_REPOSITORY, revision: git(["rev-parse", "HEAD"]), providerRevision: event.pull_request?.head.sha ?? process.env.GITHUB_SHA,
    runId: process.env.GITHUB_RUN_ID, attempt: process.env.GITHUB_RUN_ATTEMPT, workflow };
  if (process.env.GITHUB_ACTIONS !== "true" || process.env.CI !== "true" || result.revision !== process.env.GITHUB_SHA || git(["status", "--porcelain"])
    || !/^\d+$/.test(result.runId ?? "") || !/^\d+$/.test(result.attempt ?? "") || path.resolve(process.env.GITHUB_WORKSPACE) !== root) throw new Error("Qualification requires the exact clean provider checkout and attempt");
  return result;
}

/** Old full workflows are migration anchors only when their exact checked-out bytes and steps match. */
async function legacyProof(provider, workflow) {
  const jobs = (await api(`actions/runs/${provider.id}/attempts/${provider.run_attempt}/jobs?per_page=100`)).jobs;
  const expectedJobs = workflow === "ci" ? { quality: "quality", "package-consumer": "release-package" } : { "docs-behavior": "docs-parity", "docs-visual": "docs-parity" };
  const logs = new Map();
  let revision;
  for (const stage of stages[workflow]) {
    const job = jobs.find((candidate) => candidate.name === expectedJobs[stage]);
    if (!job || job.status !== "completed" || job.run_id !== provider.id || job.run_attempt !== provider.run_attempt || job.head_sha !== provider.head_sha || job.conclusion !== "success" || legacySteps[workflow][stage].some((name) => job.steps.filter((step) => step.name === name && step.status === "completed" && step.conclusion === "success").length !== 1)) throw new Error("Legacy provider steps did not pass");
    if (!logs.has(job.id)) logs.set(job.id, (await api(`actions/jobs/${job.id}/logs`, true)).toString("utf8"));
    const log = logs.get(job.id);
    const checkout = checkoutRevision(log);
    if (!checkout || (revision && revision !== checkout)) throw new Error("Legacy provider checkout is not bound to all jobs");
    if (workflow === "ci" && !/\bv24\.21\.0\b/.test(log)) throw new Error("Legacy Node runtime differs from the pinned qualifier");
    const image = /##\[group\]Runner Image\r?\n[^\n]*Image:\s*(\S+)\r?\n[^\n]*Version:\s*(\S+)/.exec(log);
    const imageOS = process.env.ImageOS?.replace(/^ubuntu(\d{2})$/, "ubuntu-$1.04");
    if (workflow === "ci" && (!image || image[1] !== imageOS || image[2] !== process.env.ImageVersion)) throw new Error("Legacy native runner image differs");
    if (workflow === "docs" && !log.includes(`Digest: ${browserImage.split("@")[1]}`)) throw new Error("Legacy canonical browser image differs");
    if (!log.includes("using pnpm v10.7.1")) throw new Error("Legacy package manager differs");
    revision = checkout;
  }
  validateRevision(provider, revision);
  const workflowBytes = git(["show", `${revision}:${workflowPaths[workflow]}`], { raw: true });
  const { createHash } = await import("node:crypto");
  if (createHash("sha256").update(workflowBytes).digest("hex") !== legacyWorkflows[workflow]) throw new Error("Legacy workflow bytes are not an approved full-coverage anchor");
  return { ...providerIdentity(provider, workflow), revision, legacy: true, inputs: hashes(snapshot(revision), workflow) };
}
const providerIdentity = (provider, workflow) => ({ repository: process.env.GITHUB_REPOSITORY, revision: provider.head_sha, providerRevision: provider.head_sha, runId: String(provider.id), attempt: String(provider.run_attempt), workflow });

async function receiptProof(provider, workflow, expectedContract) {
  const artifacts = (await api(`actions/runs/${provider.id}/artifacts?per_page=100`)).artifacts;
  const artifact = artifacts.find((entry) => entry.name === `qualification-${workflow}-${provider.run_attempt}` && !entry.expired);
  if (!artifact) return legacyProof(provider, workflow);
  const archive = path.join(directory, `provider-${provider.id}.zip`);
  writeFileSync(archive, await api(`actions/artifacts/${artifact.id}/zip`, true));
  const receipt = JSON.parse(execFileSync("unzip", ["-p", archive, "proof.json"], { encoding: "utf8", maxBuffer: 1024 ** 2 }));
  const expectedIdentity = { ...providerIdentity(provider, workflow), revision: receipt.revision };
  validateRevision(provider, receipt.revision);
  const source = snapshot(receipt.revision);
  if (contract(source, workflow) !== expectedContract) throw new Error("Provider qualifier/workflow bytes differ from the current contract");
  const inputs = hashes(source, workflow);
  validateReceipt(receipt, expectedIdentity, expectedContract, inputs);
  return { ...expectedIdentity, inputs, legacy: false };
}

async function baseline(workflow, expectedContract) {
  const providers = (await api(`actions/workflows/${path.basename(workflowPaths[workflow])}/runs?status=success&per_page=50`)).workflow_runs;
  for (const provider of providers) {
    if (String(provider.id) === process.env.GITHUB_RUN_ID) continue;
    try {
      validateProvider(provider, providerIdentity(provider, workflow));
      return await receiptProof(provider, workflow, expectedContract);
    } catch (error) { console.log(`Proof ${provider.id} is ineligible: ${error.message}`); }
  }
  throw new Error("No valid provider baseline. Establish an explicitly requested full qualification; missing proof never starts an automatic full sweep.");
}

function changedHunks(base, revision) {
  const result = {};
  let file;
  for (const line of git(["diff", "--unified=0", base, revision, "--", "packages/looma/tests", "apps/docs/tests", "tools/scripts"]).split("\n")) {
    if (line.startsWith("+++ b/")) { file = line.slice(6); result[file] = []; }
    const match = /^@@ .* \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (match && file) result[file].push([Number(match[1]), Number(match[1]) + Math.max(1, Number(match[2] ?? 1)) - 1]);
  }
  return result;
}

async function stagePlan(workflow, current) {
  const files = snapshot(current.revision);
  const source = snapshot(current.revision, true);
  const inputs = hashes(files, workflow);
  const currentContract = contract(files, workflow);
  const previous = await baseline(workflow, currentContract);
  const changes = git(["diff", "--name-only", previous.revision, current.revision]).split("\n").filter(Boolean);
  const selection = selectChecks(source, changes, changedHunks(previous.revision, current.revision));
  const stagePlans = Object.fromEntries(stages[workflow].map((stage) => [stage, { reused: previous.inputs[stage] === inputs[stage], fingerprint: inputs[stage] }]));
  return { version: 1, ...current, workflow, contract: currentContract, baseline: previous, changes, selection, stages: stagePlans };
}
async function plan(workflow, current) {
  const plans = {};
  for (const family of ["ci", "docs"]) plans[family] = await stagePlan(family, current);
  const budget = admitQualification(plans, snapshot(current.revision, true));
  const receipt = { ...plans[workflow], budget, budgetPlans: plans };
  write("plan.json", receipt);
  if (process.env.GITHUB_OUTPUT) {
    for (const stage of stages[workflow]) appendFileSync(process.env.GITHUB_OUTPUT, `${stage}=${!receipt.stages[stage].reused}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `chromium=${!receipt.stages.quality?.reused && Object.keys(receipt.selection.packageTests).some(isBrowserTest)}\n`);
  }
  console.log(JSON.stringify({ changes: receipt.changes, selection: receipt.selection, stages: receipt.stages, budget }, null, 2));
}

function checkPlan(saved, current) {
  if (Object.entries(current).some(([key, value]) => saved[key] !== value) || saved.contract !== contract(snapshot(current.revision), current.workflow)
    || JSON.stringify(hashes(snapshot(current.revision), current.workflow)) !== JSON.stringify(Object.fromEntries(Object.entries(saved.stages).map(([stage, entry]) => [stage, entry.fingerprint])))) throw new Error("Plan does not match this checkout/provider attempt");
  for (const family of ["ci", "docs"]) {
    const planned = saved.budgetPlans[family];
    getRevision(planned.baseline.revision);
    const changes = git(["diff", "--name-only", planned.baseline.revision, current.revision]).split("\n").filter(Boolean);
    const actual = selectChecks(snapshot(current.revision, true), changes, changedHunks(planned.baseline.revision, current.revision));
    if (planned.revision !== current.revision || planned.contract !== contract(snapshot(current.revision), family) || JSON.stringify(actual) !== JSON.stringify(planned.selection) || JSON.stringify(changes) !== JSON.stringify(planned.changes)
      || stages[family].some((stage) => planned.stages[stage].reused !== (planned.baseline.inputs[stage] === planned.stages[stage].fingerprint))) throw new Error("Aggregate plan selection does not match the actual diff");
  }
  if (JSON.stringify(saved.budgetPlans[current.workflow].selection) !== JSON.stringify(saved.selection) || JSON.stringify(saved.budgetPlans[current.workflow].stages) !== JSON.stringify(saved.stages)) throw new Error("Stage plan differs from aggregate admission");
  if (JSON.stringify(admitQualification(saved.budgetPlans, snapshot(current.revision, true))) !== JSON.stringify(saved.budget)) throw new Error("Aggregate qualification admission differs");
}

function quality(selection) {
  const tests = [];
  for (const [file, names] of Object.entries(selection.scriptTests)) {
    const result = spawnSync("node", ["--test", "--test-reporter=tap", ...(names ? ["--test-name-pattern", caseNamePattern(names)] : []), file], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 ** 2 });
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    if (result.status !== 0) throw new Error("Selected script fixtures failed");
    tests.push(...validateNodeReport(result.stdout, names ?? testCases(snapshot("HEAD", true)[file]).map(({ name }) => name)));
  }
  if (selection.source || Object.keys(selection.packageTests).length || selection.storybook) run(["--filter", "@threadlabs/looma", "build"]);
  if (selection.source) {
    run(["check:code-documentation"]);
    run(["exec", "dprint", "check", ...selection.components.flatMap((tag) => [`packages/looma/src/components/${tag}/**/*.html`])]);
    run(["--filter", "@threadlabs/looma", "typecheck"]); // lint and typecheck are the same package command.
  }
  for (const [file, titles] of Object.entries(selection.packageTests)) {
    const report = path.join(directory, `${path.basename(file)}-report.json`);
    run(vitestArguments(file, titles, report));
    tests.push(...validateVitestReport(JSON.parse(readFileSync(report, "utf8")), titles));
  }
  if (selection.storybook) run(["--filter", "@threadlabs/looma-storybook", "build"]);
  return tests;
}

function docs(stage, selection) {
  if (!selection.docs) throw new Error("Changed documentation inputs have no selected checks");
  const visual = stage === "docs-visual";
  const env = { ...process.env, LOOMA_DOCS_CANONICAL: "1", LOOMA_DOCS_REPORT: visual ? "visual" : "behavior" };
  const tests = [];
  for (const [file, grep] of Object.entries(selection.docsTests).filter(([file]) => visual === file.endsWith("visual.spec.ts"))) {
    const args = ["--filter", "@threadlabs/looma-docs", "exec", "playwright", "test", file.replace("apps/docs/", ""), "--workers=1", "--retries=0",
      ... (visual ? ["--project=visual"] : ["--project=chromium", "--project=firefox", "--project=webkit"]), ...(grep ? ["--grep", grep] : [])];
    const discovery = JSON.parse(execFileSync("pnpm", [...args, "--list", "--reporter=json"], { cwd: root, env, encoding: "utf8", maxBuffer: 16 * 1024 ** 2 }));
    // A shared grep can have no matches in an unrelated spec; it must never launch that runner.
    if (!browserTestIds(discovery).length) continue;
    const report = path.join(directory, `${stage}-${path.basename(file)}-report.json`);
    run([...args, "--reporter=json"], { env: { ...env, PLAYWRIGHT_JSON_OUTPUT_NAME: report } });
    tests.push(...validateBrowserReport(discovery, JSON.parse(readFileSync(report, "utf8"))));
  }
  if (!tests.length) throw new Error("Empty documentation selection");
  return tests;
}

async function main() {
  const [command, workflow, stage] = process.argv.slice(2);
  if (command === "inspect") {
    if (!stages[workflow]) throw new Error("Choose ci or docs provider inspection");
    mkdirSync(directory, { recursive: true });
    const provider = await api(`actions/runs/${stage}`);
    validateProvider(provider, providerIdentity(provider, workflow));
    const verified = await receiptProof(provider, workflow, contract(snapshot("HEAD"), workflow));
    console.log(JSON.stringify({ provider: verified, matches: Object.fromEntries(stages[workflow].map((name) => [name, verified.inputs[name] === hashes(snapshot("HEAD"), workflow)[name]])) }, null, 2));
    return;
  }
  const current = identity(workflow);
  mkdirSync(directory, { recursive: true });
  if (command === "plan") return plan(workflow, current);
  const saved = json("plan.json");
  getRevision(saved.baseline.revision);
  checkPlan(saved, current);
  if (command === "combine") {
    const reports = Object.fromEntries(stages[workflow].map((name) => {
      const receipt = json(`${name}.json`);
      if (Object.entries(current).some(([key, value]) => receipt[key] !== value) || receipt.stage !== name || receipt.passed !== true || receipt.fingerprint !== saved.stages[name].fingerprint) throw new Error("Missing or mismatched stage proof");
      return [name, receipt];
    }));
    return write("proof.json", { version: 1, ...current, contract: saved.contract, stages: reports });
  }
  if (command !== "run" || !stages[workflow].includes(stage)) throw new Error("Unknown qualification command/stage");
  let tests = [];
  if (saved.stages[stage].reused) {
    const provider = await api(`actions/runs/${saved.baseline.runId}`);
    validateProvider(provider, saved.baseline);
    const verified = await receiptProof(provider, workflow, saved.contract);
    if (verified.inputs[stage] !== saved.stages[stage].fingerprint) throw new Error("Reused provider input mismatch");
    console.log(`Reusing ${stage} from successful provider run ${provider.id}, checkout ${verified.revision}`);
  } else if (stage === "quality") tests = quality(saved.selection);
  else if (stage === "package-consumer") run(["release:verify"]);
  else tests = docs(stage, saved.selection);
  // Builds write only ignored outputs. Source identity and stage inputs must remain unchanged.
  identity(workflow);
  write(`${stage}.json`, { ...current, stage, fingerprint: saved.stages[stage].fingerprint, passed: true, tests, reused: saved.stages[stage].reused, baseline: saved.baseline });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
