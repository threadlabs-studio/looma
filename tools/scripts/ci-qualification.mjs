import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { automaticChecks, validateVitestReport, vitestArguments } from "./ci-selection.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const gitOwnership = ["-c", `safe.directory=${root}`];
const directory = path.join(root, ".qualification");
const git = (args) => execFileSync("git", [...gitOwnership, ...args], { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 ** 2 }).trim();
const run = (args) => {
  const result = spawnSync("pnpm", args, { cwd: root, stdio: "inherit", env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Selected check failed: pnpm ${args.join(" ")}`);
};
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
  const needed = Object.keys(files).filter((file) => /^(?:packages\/looma\/(?:src|tests)\/|tools\/scripts\/)/.test(file) && /\.(?:html|tsx?|js|mjs|mdx?|json)$/.test(file));
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

/** Compare the whole PR with its base, or a push with its before revision. No historical CI proof. */
export function changeBase(event, revision) {
  if (event.pull_request?.base.sha) return git(["merge-base", event.pull_request.base.sha, revision]);
  if (event.before && !/^0+$/.test(event.before)) return event.before;
  return git(["rev-parse", `${revision}^`]);
}

export function plan(base) {
  const revision = git(["rev-parse", "HEAD"]);
  const event = process.env.GITHUB_EVENT_PATH ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")) : {};
  base ??= process.env.LOOMA_CI_BASE ?? changeBase(event, revision);
  const changes = git(["diff", "--name-only", base, "--"]).split("\n").filter(Boolean);
  const hunks = {};
  let file;
  for (const line of git(["diff", "--unified=0", base, "--", "packages/looma/tests", "tools/scripts"]).split("\n")) {
    if (line.startsWith("+++ b/")) { file = line.slice(6); hunks[file] = []; }
    const match = /^@@ .* \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (match && file) hunks[file].push([Number(match[1]), Number(match[1]) + Math.max(1, Number(match[2] ?? 1)) - 1]);
  }
  const files = { ...snapshot(revision, true) };
  // Local verification includes the working tree; Actions checks out the exact tested merge.
  for (const [file, contents] of Object.entries(files)) {
    if (!existsSync(path.join(root, file))) { delete files[file]; continue; }
    if (!/^\d+:/.test(contents)) files[file] = readFileSync(path.join(root, file), "utf8");
  }
  for (const file of changes) if (existsSync(path.join(root, file)) && /\.(?:html|tsx?|js|mjs|mdx?|json)$/.test(file)) files[file] = readFileSync(path.join(root, file), "utf8");
  return { base, revision, changes, selection: automaticChecks(files, changes, hunks) };
}

function packageTests(tests) {
  for (const [file, titles] of Object.entries(tests)) {
    const report = path.join(directory, `${path.basename(file)}-report.json`);
    run(vitestArguments(file, titles, report));
    validateVitestReport(JSON.parse(readFileSync(report, "utf8")), titles);
  }
}

async function main() {
  const [command, stage] = process.argv.slice(2);
  const selected = plan();
  const selection = selected.selection;
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, "plan.json"), JSON.stringify(selected, null, 2) + "\n");
  console.log(JSON.stringify(selected, null, 2));
  if (command === "plan") {
    if (process.env.GITHUB_OUTPUT) for (const [name, value] of Object.entries({
      quality: selection.source || selection.scripts.length > 0 || Object.keys(selection.nativeTests).length > 0,
      browser: Object.keys(selection.browserTests).length > 0,
      package: selection.packageConsumer, docs: selection.docsBuild,
    })) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
    return;
  }
  if (command !== "run") throw new Error("Choose plan or run quality/browser/package-consumer/docs");
  if (stage === "quality") {
    // Run the selected script files together instead of spawning Node once for every case/file.
    if (selection.scripts.length) {
      const result = spawnSync(process.execPath, ["--test", ...selection.scripts], { cwd: root, stdio: "inherit" });
      if (result.error) throw result.error;
      if (result.status !== 0) throw new Error("Selected script fixtures failed");
    }
    if (selection.source || Object.keys(selection.nativeTests).length) {
      run(["--filter", "@threadlabs/looma", "build"]);
      packageTests(selection.nativeTests);
    }
  } else if (stage === "browser") {
    if (!Object.keys(selection.browserTests).length) return;
    run(["--filter", "@threadlabs/looma", "build"]);
    packageTests(selection.browserTests);
  } else if (stage === "package-consumer") {
    if (selection.packageConsumer) run(["release:verify"]);
  } else if (stage === "docs") {
    if (!selection.docsBuild) return;
    run(["--filter", "@threadlabs/looma", "build"]);
    run(["--filter", "@threadlabs/looma-docs", "build"]);
    run(["--filter", "@threadlabs/looma-docs", "typecheck:tests"]);
    run(["--filter", "@threadlabs/looma-docs", "docs:coverage"]);
  } else throw new Error(`Unknown stage: ${stage}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
