import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { checkoutRevision, fingerprint, stages, validateProvider } from "./reuse-stage-proof.mjs";

const source = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const sha = "a".repeat(40);
const base = "b".repeat(40);
const checkout = "c".repeat(40);
function fixture(stage = "quality") {
  const workflow = source(stages[stage].workflow);
  const providerWorkflow = workflow.replaceAll("node-version: 24.21.0", "node-version: 24");
  const runner = stage === "docs-parity" ? "ubuntu-24.04-arm" : "ubuntu-latest";
  const imageOS = stage === "docs-parity" ? "ubuntu-24.04-arm" : "ubuntu-24.04";
  const digest = "sha256:beddddcf96f19abec078cd2f3da676f40abd460e0e734ad5eed73627ce161d33";
  return {
    repository: "owner/repo", stage, currentWorkflow: workflow, providerWorkflow,
    packageManager: "pnpm@10.7.1", imageOS, imageVersion: "123.4",
    run: { id: 123, run_attempt: 1, head_sha: sha, repository: { full_name: "owner/repo", id: 1 }, head_repository: { full_name: "owner/repo" }, status: "completed", conclusion: "success", path: stages[stage].workflow, event: "pull_request", pull_requests: [{ head: { sha, repo: { id: 1 } }, base: { sha: base, repo: { id: 1 } } }] },
    job: { run_id: 123, run_attempt: 1, head_sha: sha, name: stage, status: "completed", conclusion: "success", labels: [runner], steps: stages[stage].steps.map((name) => ({ name, status: "completed", conclusion: "success" })) },
    commit: { sha: checkout, parents: [{ sha }, { sha: base }] },
    log: `stamp [command]/usr/bin/git log -1 --format=%H\nstamp ${checkout}\nstamp ##[group]Runner Image\nstamp Image: ${imageOS}\nstamp Version: 123.4\nstamp node: v24.21.0\nstamp Done using pnpm v10.7.1\nstamp Digest: ${digest}\n`
  };
}

test("only actual successful provider stages qualify, including original merge checkout", () => {
  for (const stage of Object.keys(stages)) assert.equal(validateProvider(fixture(stage)), checkout);
  assert.notEqual(checkoutRevision(fixture().log), sha);
  const movedHead = fixture("docs-parity");
  movedHead.run.pull_requests[0].head.sha = "d".repeat(40);
  movedHead.imageOS = undefined;
  movedHead.imageVersion = undefined;
  assert.equal(validateProvider(movedHead), checkout, "immutable run head and container bind historical proof");
});

test("proof fails closed for skipped execution, foreign source, attempts, checkout, runtime and changed commands", () => {
  const cases = [
    (f) => { f.job.steps.at(-1).conclusion = "skipped"; },
    (f) => { f.job.conclusion = "failure"; },
    (f) => { f.run.head_repository.full_name = "foreign/repo"; },
    (f) => { f.job.run_attempt = 2; },
    (f) => { f.commit.parents[0].sha = base; },
    (f) => { f.imageVersion = "new"; },
    (f) => { f.currentWorkflow = f.currentWorkflow.replace("24.21.0", "24.22.0"); },
    (f) => { f.packageManager = "pnpm@10.8.0"; },
    (f) => { f.currentWorkflow = f.currentWorkflow.replace("run: pnpm test\n", "run: echo skipped\n"); }
  ];
  for (const change of cases) { const f = fixture(); change(f); assert.throws(() => validateProvider(f)); }
  const docs = fixture("docs-parity");
  docs.currentWorkflow = docs.currentWorkflow.replace("beddddcf", "deddddcf");
  assert.throws(() => validateProvider(docs), /container/);
  assert.throws(() => checkoutRevision("no checkout evidence"));
});

test("fingerprints include tracked product, lock, test and build inputs; docs exclude only native tests and orchestration", () => {
  const paths = ["packages/looma/src/components/badge/badge.html", "pnpm-lock.yaml", "tools/scripts/build.mjs", "packages/looma/tests/browser.test.ts", "apps/docs/tests/visual.spec.ts", ".github/workflows/ci.yml", "tools/scripts/reuse-stage-proof.mjs"];
  const entries = paths.map((path) => ({ path, mode: "100644", type: "blob", sha }));
  for (let i = 0; i < paths.length; i++) {
    const changed = structuredClone(entries); changed[i].sha = base;
    const excluded = i >= 5;
    assert.equal(fingerprint(entries, "quality") === fingerprint(changed, "quality"), excluded, paths[i]);
    assert.equal(fingerprint(entries, "docs-parity") === fingerprint(changed, "docs-parity"), excluded || i === 3, paths[i]);
  }
  assert.equal(fingerprint(entries, "quality"), fingerprint([...entries].reverse(), "quality"));
  assert.notEqual(fingerprint(entries, "quality"), fingerprint(entries.slice(1), "quality"));
});

test("stable required jobs run focused validator checks before proof and do not fall back after failure", () => {
  for (const [stage, policy] of Object.entries(stages)) {
    const workflow = source(policy.workflow);
    const block = workflow.match(new RegExp(`\\n  ${stage}:\\n[\\s\\S]*?(?=\\n  [\\w-]+:\\n|$)`))[0];
    assert.ok(block.indexOf("node --test tools/scripts/reuse-stage-proof.test.mjs") < block.indexOf("id: proof"));
    assert.match(block, /steps\.proof\.outputs\.reused != 'true'/);
    assert.doesNotMatch(block, /continue-on-error/);
  }
});
