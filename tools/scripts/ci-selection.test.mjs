import assert from "node:assert/strict";
import test from "node:test";
import { affectedComponents, selectChecks, stageInputs, fingerprint, validateProvider, validateReceipt, validateBrowserReport } from "./ci-selection.mjs";

const files = {
  "packages/looma/src/components/ui-button/ui-button.html": '<template component="ui-button"></template>',
  "packages/looma/src/components/ui-menu/ui-menu.html": '<link rel="component" href="../ui-button/ui-button.html">',
  "packages/looma/src/components/ui-badge/ui-badge.html": '<template component="ui-badge"></template>',
  "packages/looma/tests/browser.test.ts": 'it("button click", async () => { open("<ui-button>"); });\nit("badge paint", async () => { open("<ui-badge>"); });',
  "packages/looma/tests/button-ssr.test.ts": 'import Button from "../vue/UiButton.js"; it("button SSR", () => render(Button));',
  "apps/docs/docs/components/ui-menu.mdx": '<Menu />',
  "apps/docs/tests/page-parity.spec.ts": 'for (const doc of coverage.pages) test(`${doc.path}: content`, () => {});',
  "apps/docs/tests/visual.spec.ts": 'for (const doc of coverage.pages) test(`${doc.path}: reviewed page`, () => {});',
  "apps/docs/tests/docs-fixture.ts": 'export const ready = () => {};',
  "apps/docs/tests/coverage.json": JSON.stringify({ pages: [{ path: "components/ui-button", component: "ui-button" }, { path: "components/ui-menu", component: "ui-menu" }] }),
  "package.json": '{}', "pnpm-lock.yaml": "lock", "packages/looma/build.mjs": "build"
};

test("a primitive selects transitive consumers and only related cases in a shared file", () => {
  assert.deepEqual(affectedComponents(files, ["ui-button"]), ["ui-button", "ui-menu"]);
  const plan = selectChecks(files, ["packages/looma/src/components/ui-button/ui-button.html"]);
  assert.equal(plan.full, false);
  assert.deepEqual(plan.packageTests["packages/looma/tests/browser.test.ts"], ["button click"]);
  assert.deepEqual(plan.packageTests["packages/looma/tests/button-ssr.test.ts"], ["button SSR"]);
  assert.ok(plan.docsRoutes.includes("components/ui-menu"));
  assert.ok(!plan.docsRoutes.includes("components/ui-badge"));
});

test("test-only revisions preserve docs and package-consumer fingerprints", () => {
  const revised = { ...files, "packages/looma/tests/browser.test.ts": files["packages/looma/tests/browser.test.ts"] + "// assertion" };
  for (const stage of ["package-consumer", "docs-behavior", "docs-visual"]) {
    assert.equal(fingerprint(stageInputs(files, stage)), fingerprint(stageInputs(revised, stage)));
  }
  assert.notEqual(fingerprint(stageInputs(files, "quality")), fingerprint(stageInputs(revised, "quality")));
  const plan = selectChecks(revised, ["packages/looma/tests/browser.test.ts"]);
  assert.deepEqual(plan.docsRoutes, []);
});

test("shared themes/compiler inputs select full coverage and unmapped inputs fail closed", () => {
  for (const changed of ["packages/looma/src/tokens/theme.css", "packages/looma/build.mjs", "pnpm-lock.yaml", "packages/looma/src/components/shared/focus.js"]) {
    assert.equal(selectChecks(files, [changed]).full, true, changed);
  }
  assert.throws(() => selectChecks(files, ["new-runtime/unknown.js"]), /Unmapped/);
});

const provider = { id: 42, run_attempt: 1, head_sha: "a".repeat(40), conclusion: "success", status: "completed", event: "pull_request", path: ".github/workflows/ci.yml", head_repository: { full_name: "threadlabs-studio/looma" } };
const identity = { repository: "threadlabs-studio/looma", revision: provider.head_sha, runId: "42", attempt: "1", workflow: "ci" };
test("provider proof rejects a failed, forked, wrong-workflow or wrong-revision run", () => {
  assert.doesNotThrow(() => validateProvider(provider, identity));
  for (const change of [{ conclusion: "failure" }, { head_sha: "b".repeat(40) }, { path: ".github/workflows/other.yml" }, { head_repository: { full_name: "other/looma" } }, { run_attempt: 2 }]) {
    assert.throws(() => validateProvider({ ...provider, ...change }, identity), /Provider/);
  }
});
test("receipts bind stage inputs and the clean provider identity", () => {
  const receipt = { version: 1, ...identity, contract: "contract", stages: { quality: { fingerprint: "inputs", passed: true } } };
  assert.doesNotThrow(() => validateReceipt(receipt, identity, "contract", { quality: "inputs" }));
  for (const change of [{ revision: "b".repeat(40) }, { contract: "stale" }, { stages: { quality: { fingerprint: "wrong", passed: true } } }, { stages: {} }]) {
    assert.throws(() => validateReceipt({ ...receipt, ...change }, identity, "contract", { quality: "inputs" }), /Receipt/);
  }
});
test("browser proof refuses zero tests, skipped tests, failures and a discovery mismatch", () => {
  const report = { suites: [{ specs: [{ id: "case", tests: [{ projectName: "chromium", status: "expected", results: [{ status: "passed" }] }] }] }] };
  assert.deepEqual(validateBrowserReport(report, report), ["case:chromium"]);
  assert.throws(() => validateBrowserReport({ suites: [] }, { suites: [] }), /Empty/);
  assert.throws(() => validateBrowserReport(report, { suites: [] }), /match/);
  for (const status of ["skipped", "failed", "timedOut"]) {
    const failed = structuredClone(report); failed.suites[0].specs[0].tests[0].results[0].status = status;
    assert.throws(() => validateBrowserReport(report, failed), /passed/);
  }
});
