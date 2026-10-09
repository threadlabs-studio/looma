import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { snapshot } from "./ci-qualification.mjs";
import { admitQualification, affectedComponents, affectedModules, caseNamePattern, checkoutRevision, isBrowserTest, selectChecks, stageInputs, fingerprint, testCases, validateCheckout, validateProvider, validateReceipt, validateBrowserReport, validateNodeReport, validateVitestReport, vitestArguments } from "./ci-selection.mjs";

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

test("edited assertions select their case and edited helpers own their enclosing suite", () => {
  const file = "packages/looma/tests/browser.test.ts";
  const source = 'describe("Other", () => {\n it("other", () => {});\n});\ndescribe("chips", () => {\n const glyphs = () => "ink";\n it("native chips", () => { glyphs(); });\n it("Vue chips", () => { glyphs(); });\n});\n';
  assert.deepEqual(selectChecks({ ...files, [file]: source }, [file], { [file]: [[6, 6]] }).packageTests[file], ["chips native chips"]);
  assert.deepEqual(selectChecks({ ...files, [file]: source }, [file], { [file]: [[5, 5]] }).packageTests[file], ["chips native chips", "chips Vue chips"]);
  assert.throws(() => selectChecks({ ...files, "tools/scripts/new-executable.mjs": "doWork()" }, ["tools/scripts/new-executable.mjs"]), /Unmapped executable/);
});

test("shared themes/compiler inputs select full coverage and unmapped inputs fail closed", () => {
  for (const changed of ["packages/looma/src/tokens/theme.css", "packages/looma/build.mjs", "pnpm-lock.yaml", "packages/looma/src/components/shared/focus.js"]) {
    assert.equal(selectChecks(files, [changed]).full, true, changed);
  }
  assert.throws(() => selectChecks(files, ["new-runtime/unknown.js"]), /Unmapped/);
});

const provider = { id: 42, run_attempt: 1, head_sha: "a".repeat(40), conclusion: "success", status: "completed", event: "pull_request", path: ".github/workflows/ci.yml", repository: { full_name: "threadlabs-studio/looma", id: 1 }, head_repository: { full_name: "threadlabs-studio/looma", id: 1 } };
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

test("shared TS/controller imports propagate, while example compositions remain one-way docs consumers", () => {
  const graph = { ...files,
    "packages/looma/src/components/ui-button/ui-button.html": '<template component="ui-button" controller="./ui-button.js"></template>',
    "packages/looma/src/components/shared/state.ts": "export const state = {};",
    "packages/looma/src/components/ui-button/ui-button.js": 'import { state } from "../shared/state.js";',
    "packages/looma/src/components/ui-table/examples/01-default.html": "<ui-badge>Ready</ui-badge>",
    "packages/looma/src/components/ui-card/examples/01-default.html": "<ui-table>Other</ui-table>"
  };
  const shared = selectChecks(graph, ["packages/looma/src/components/shared/state.ts"]);
  assert.equal(shared.full, false);
  assert.deepEqual(shared.components, ["ui-button", "ui-menu"]);
  assert.ok(affectedModules(graph, ["packages/looma/src/components/shared/state.ts"]).includes("packages/looma/src/components/ui-button/ui-button.html"));
  const badge = selectChecks(graph, ["packages/looma/src/components/ui-badge/ui-badge.html"]);
  assert.ok(badge.docsComponents.includes("ui-table"));
  assert.ok(!badge.components.includes("ui-table"));
  assert.ok(!badge.docsComponents.includes("ui-card"));
});

test("provider checkout binds immutable run head and retained main ancestry despite a later PR head/base", () => {
  const run = { ...provider, pull_requests: [{ head: { sha: "later-head", repo: { id: 1 } }, base: { sha: "later-base", ref: "main", repo: { id: 1 } } }] };
  const merge = "c".repeat(40), parents = ["b".repeat(40), run.head_sha];
  const log = `timestamp [command]/usr/bin/git log -1 --format=%H\ntimestamp ${merge}\n`;
  assert.equal(checkoutRevision(log), merge);
  assert.doesNotThrow(() => validateCheckout(run, merge, parents, true));
  assert.doesNotThrow(() => validateCheckout({ ...run, pull_requests: [] }, merge, parents, true));
  assert.throws(() => validateCheckout(run, merge, parents, false), /ancestry/);
  assert.throws(() => validateCheckout(run, merge, [parents[0], "later-head"], true), /head/);
  assert.throws(() => checkoutRevision(log + log), /one actual/);
  assert.throws(() => checkoutRevision("no checkout"), /one actual/);
});

test("merged source selects Badge consumers including Table, Combobox, Conventions, home and catalog", () => {
  const actual = snapshot("origin/main", true);
  const plan = selectChecks(actual, ["packages/looma/src/components/ui-badge/ui-badge.html"]);
  assert.ok(plan.components.includes("ui-combobox"));
  assert.ok(!plan.components.includes("ui-meter"), "a prose comparison is not a runtime dependency");
  assert.ok(plan.docsComponents.includes("ui-table"));
  for (const route of ["components/ui-badge", "components/ui-table", "components/ui-combobox", "conventions", "./", "components"]) assert.ok(plan.docsRoutes.includes(route), route);
  assert.ok(!plan.docsRoutes.includes("components/ui-checkbox"));
  assert.ok(plan.packageTests["packages/looma/tests/browser.test.ts"].includes("Combobox chip truncation ellipsizes native chip labels inside their badge at desktop and 375px"));
});

test("the real assertion-only revision owns the four shared chip cases and preserves UI/docs inputs", () => {
  const base = "b4bcb3d", head = "963645e4";
  const file = "packages/looma/tests/browser.test.ts";
  const diff = execFileSync("git", ["diff", "--unified=0", base, head, "--", file], { encoding: "utf8" });
  const hunks = [...diff.matchAll(/^@@ .* \+(\d+)(?:,(\d+))? @@/gm)].map((match) => [Number(match[1]), Number(match[1]) + Math.max(1, Number(match[2] ?? 1)) - 1]);
  const before = snapshot(base), after = snapshot(head);
  const plan = selectChecks(snapshot(head, true), [file], { [file]: hunks });
  assert.deepEqual(plan.packageTests[file], ["Combobox chip truncation ellipsizes native chip labels inside their badge at desktop and 375px", "Combobox chip truncation ellipsizes Vue chip labels inside their badge at desktop and 375px", "Combobox chip truncation keeps short ${adapter} chip text and descenders visible at desktop and 375px"]);
  assert.deepEqual(plan.docsRoutes, []);
  for (const stage of ["package-consumer", "docs-behavior", "docs-visual"]) assert.equal(fingerprint(stageInputs(before, stage)), fingerprint(stageInputs(after, stage)), stage);
});

test("qualified names avoid unrelated duplicate titles and retain parameterized cases", () => {
  const pattern = new RegExp(caseNamePattern(["Combobox cannot be cleared", "Dialog keeps ${adapter} inset", "%s tools dismiss"]));
  assert.ok(pattern.test("Combobox cannot be cleared"));
  assert.ok(!pattern.test("Select cannot be cleared"));
  assert.ok(pattern.test("Dialog keeps html inset"));
  assert.ok(pattern.test("bubble tools dismiss"));
});

test("case discovery ignores fixture source strings and commented calls", () => {
  const source = `const fixture = 'it("fictional", () => {});';\n// test("commented", () => {});\n/* describe("commented suite", () => { it("also fictional", () => {}); }); */\ndescribe("real", () => { it("owned", () => {}); });`;
  assert.deepEqual(testCases(source).map(({ name }) => name), ["real owned"]);
});

test("main and editor browser suites share Chromium ownership while retaining their actual Vitest configs", () => {
  const main = "packages/looma/tests/browser.test.ts", editor = "packages/looma/tests/looma-editor-chip.browser.test.ts";
  for (const [file, config] of [[main, "vitest.config.ts"], [editor, "vitest.browser.config.ts"]]) {
    assert.equal(isBrowserTest(file), true);
    const args = vitestArguments(file, ["owned"], "report.json");
    assert.equal(args[args.indexOf("--config") + 1], config);
    assert.ok(args.includes("--maxWorkers=1"));
  }
  assert.equal(isBrowserTest("packages/looma/tests/tree.test.ts"), false);
  const actual = snapshot("origin/main", true);
  assert.ok(selectChecks(actual, ["packages/looma/vitest.config.ts"]).packageTests[main]);
  assert.ok(selectChecks(actual, ["packages/looma/vitest.browser.config.ts"]).packageTests[editor]);
  const runner = readFileSync(new URL("./ci-qualification.mjs", import.meta.url), "utf8");
  assert.match(runner, /packageTests\)\.some\(isBrowserTest\)/);
  assert.match(runner, /run\(vitestArguments\(/);
  assert.match(runner, /safe\.directory=\$\{root\}/);
  assert.doesNotMatch(runner, /git config --global/);
});

test("Vitest proof refuses empty, skipped or missing selected cases while ignoring unchanged filtered cases", () => {
  const report = { success: true, testResults: [{ assertionResults: [{ fullName: "chips native", status: "passed" }, { fullName: "other native", status: "pending" }] }] };
  assert.deepEqual(validateVitestReport(report, ["chips native"]), ["chips native"]);
  assert.throws(() => validateVitestReport(report, ["missing"]), /Empty/);
  assert.throws(() => validateVitestReport(report, ["other native"]), /passed/);
  assert.throws(() => validateVitestReport({ success: true, testResults: [] }, null), /Empty/);
});

test("Node proof rejects a successful file wrapper when no selected case ran", () => {
  const passing = "# Subtest: suite\n    # Subtest: owned case\n    ok 1 - owned case\nok 1 - suite\n";
  assert.deepEqual(validateNodeReport(passing, ["suite owned case"]), ["suite owned case"]);
  assert.throws(() => validateNodeReport("# Subtest: tests/owner.test.mjs\nok 1 - tests/owner.test.mjs\n", ["owned case"]), /missing/);
  for (const result of ["not ok 1 - owned case", "ok 1 - owned case # SKIP", "ok 1 - owned case # TODO"]) assert.throws(() => validateNodeReport(`# Subtest: owned case\n${result}\n`, ["owned case"]), /skipped or failed/);
  assert.throws(() => validateNodeReport(passing, []), /Empty/);
});

test("aggregate admission includes both workflows and setup, rejecting full or unknown oversized scope", () => {
  const selection = selectChecks(files, []);
  const plans = { ci: { selection, stages: { quality: { reused: true }, "package-consumer": { reused: true } } }, docs: { selection, stages: { "docs-behavior": { reused: true }, "docs-visual": { reused: true } } } };
  assert.deepEqual(admitQualification(plans, files), { estimatedMinutes: 4, limit: 15 });
  const selected = structuredClone(plans);
  selected.ci.stages.quality.reused = false;
  selected.ci.selection.packageTests["packages/looma/tests/browser.test.ts"] = ["chip native", "chip Vue"];
  assert.ok(admitQualification(selected, files).estimatedMinutes > 4);
  selected.ci.selection.packageTests["packages/looma/tests/browser.test.ts"] = Array.from({ length: 300 }, (_, index) => `case ${index}`);
  assert.throws(() => admitQualification(selected, files), /15 aggregate runner minutes/);
  selected.ci.selection.packageTests = { "packages/looma/tests/unknown.test.ts": null };
  assert.throws(() => admitQualification(selected, { ...files, "packages/looma/tests/unknown.test.ts": "generated unknown discovery" }), /No automatic full sweep/);
});
