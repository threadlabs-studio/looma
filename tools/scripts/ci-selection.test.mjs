import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { changeBase, snapshot } from "./ci-qualification.mjs";
import { automaticChecks, affectedComponents, affectedModules, caseNamePattern, isBrowserTest, smokeCases, selectChecks, testCases, validateVitestReport, vitestArguments } from "./ci-selection.mjs";

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
});

test("test-only revisions select regressions without repacking or building docs", () => {
  const plan = automaticChecks(files, ["packages/looma/tests/browser.test.ts"]);
  assert.equal(plan.packageConsumer, false);
  assert.equal(plan.docsBuild, false);
});

test("edited assertions select their case and edited helpers own their enclosing suite", () => {
  const file = "packages/looma/tests/browser.test.ts";
  const source = 'describe("Other", () => {\n it("other", () => {});\n});\ndescribe("chips", () => {\n const glyphs = () => "ink";\n it("native chips", () => { glyphs(); });\n it("Vue chips", () => { glyphs(); });\n});\n';
  assert.deepEqual(selectChecks({ ...files, [file]: source }, [file], { [file]: [[6, 6]] }).packageTests[file], ["chips native chips"]);
  assert.deepEqual(selectChecks({ ...files, [file]: source }, [file], { [file]: [[5, 5]] }).packageTests[file], ["chips native chips", "chips Vue chips"]);
  assert.throws(() => selectChecks({ ...files, "tools/scripts/new-executable.mjs": "doWork()" }, ["tools/scripts/new-executable.mjs"]), /Unmapped executable/);
});

test("added suite boundaries and trailing blank lines own their cases without promoting unrelated tests", () => {
  const file = "packages/looma/tests/browser.test.ts";
  const unchanged = Array.from({ length: 90 }, (_, index) => `it("unrelated ${index}", () => {});`).join("\n");
  const added = '\ndescribe("controls", () => {\n const paint = () => "edge";\n it("compact count", () => { paint(); });\n describe("focused actions", () => {\n  const focus = () => "ring";\n  it("shared edge", () => { focus(); });\n });\n});\n\n';
  const source = unchanged + added;
  const sourceFiles = { ...files, [file]: source };
  const hunks = { [file]: [[91, source.split("\n").length]] };
  const selection = automaticChecks(sourceFiles, [file], hunks);
  assert.deepEqual(selection.packageTests[file], ["controls compact count", "controls focused actions shared edge"]);
  assert.deepEqual(selection.browserTests[file], selection.packageTests[file]);
  assert.deepEqual(selection.deferred, [], "both added regressions fit the cap without unrelated cases");
  assert.deepEqual(selectChecks(sourceFiles, [file], { [file]: [[95, 96]] }).packageTests[file], ["controls focused actions shared edge"], "nested suite setup owns its nested cases");
  assert.deepEqual(selectChecks(sourceFiles, [file], { [file]: [[92, 92]] }).packageTests[file], selection.packageTests[file], "outer suite setup still owns every descendant case");
});

test("shared themes/compiler inputs select full coverage and unmapped inputs fail closed", () => {
  for (const changed of ["packages/looma/src/tokens/theme.css", "packages/looma/build.mjs", "pnpm-lock.yaml", "packages/looma/src/components/shared/focus.js"]) {
    assert.equal(selectChecks(files, [changed]).full, true, changed);
  }
  assert.throws(() => selectChecks(files, ["new-runtime/unknown.js"]), /Unmapped/);
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
  assert.ok(affectedComponents(graph, badge.components, true).includes("ui-table"));
  assert.ok(!badge.components.includes("ui-table"));
  assert.ok(!affectedComponents(graph, badge.components, true).includes("ui-card"));
});

test("the real Badge source selects composed consumers and bounded regression cases", () => {
  const actual = snapshot("HEAD", true);
  const plan = automaticChecks(actual, ["packages/looma/src/components/ui-badge/ui-badge.html"]);
  assert.ok(plan.components.includes("ui-combobox"));
  assert.ok(!plan.components.includes("ui-meter"));
  assert.ok(plan.browserTests["packages/looma/tests/browser.test.ts"].includes("Combobox chip truncation ellipsizes native chip labels inside their badge at desktop and 375px"));
  assert.equal(plan.packageConsumer, true);
  assert.equal(plan.docsBuild, false);
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

test("non-null division and unary regex negation preserve following nested suite names", () => {
  const source = String.raw`describe("counts", () => {
  it("opacity", () => {
    const shadows = shadow.split(/,(?![^()]*\))/);
    const opacity = pixels[3]! / 255;
    assert.ok(!/[(\)]/.test(shadow));
    return pixels[3]! / 255;
  });
});
describe("actions", () => {
  describe("nested", () => {
    it("edge", () => {});
  });
});`;
  assert.deepEqual(testCases(source).map(({ name }) => name), ["counts opacity", "actions nested edge"]);
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
  const actual = snapshot("HEAD", true);
  assert.ok(selectChecks(actual, ["packages/looma/vitest.config.ts"]).packageTests[main]);
  assert.ok(selectChecks(actual, ["packages/looma/vitest.browser.config.ts"]).packageTests[editor]);
  const runner = readFileSync(new URL("./ci-qualification.mjs", import.meta.url), "utf8");
  assert.match(runner, /run\(vitestArguments\(/);
  assert.doesNotMatch(runner, /api.github.com|legacyProof|baseline\(/);
  assert.match(runner, /safe\.directory=\$\{root\}/);
  assert.doesNotMatch(runner, /git config --global/);
});

test("qualification keeps readable Vitest failures alongside its validated JSON report", () => {
  const report = ".qualification/browser.test.ts-report.json";
  const args = vitestArguments("packages/looma/tests/browser.test.ts", ["owned"], report);
  assert.ok(args.includes("--reporter=default"), "failed assertions must remain visible in CI logs");
  assert.ok(args.includes("--reporter=json"), "qualification still validates the machine-readable report");
  assert.ok(args.includes(`--outputFile=${report}`), "the validator must read the requested JSON path");
});

test("Vitest proof refuses empty, skipped or missing selected cases while ignoring unchanged filtered cases", () => {
  const report = { success: true, testResults: [{ assertionResults: [{ fullName: "chips native", status: "passed" }, { fullName: "other native", status: "pending" }] }] };
  assert.deepEqual(validateVitestReport(report, ["chips native"]), ["chips native"]);
  assert.throws(() => validateVitestReport(report, ["missing"]), /Empty/);
  assert.throws(() => validateVitestReport(report, ["other native"]), /passed/);
  assert.throws(() => validateVitestReport({ success: true, testResults: [] }, null), /Empty/);
});

test("automatic selection budgets parallel jobs and caps browser expansion without dropping unit tests", () => {
  const source = { ...files, "packages/looma/tests/editor-table.test.ts": 'import { chromium } from "playwright"; it("table edit", () => {});', "packages/looma/tests/tree.test.ts": 'import { chromium } from "playwright"; it("tree keys", () => {});' };
  assert.equal(isBrowserTest("packages/looma/tests/editor-table.test.ts", source["packages/looma/tests/editor-table.test.ts"]), true);
  assert.equal(isBrowserTest("packages/looma/tests/tree.test.ts", source["packages/looma/tests/tree.test.ts"]), true);
  const focused = automaticChecks(source, ["packages/looma/src/components/ui-button/ui-button.html"]);
  assert.deepEqual(focused.nativeTests["packages/looma/tests/button-ssr.test.ts"], ["button SSR"]);
  assert.ok(focused.browserTests["packages/looma/tests/browser.test.ts"].includes("button click"));
  const expanded = { ...source, "packages/looma/tests/browser.test.ts": Array.from({ length: 300 }, (_, n) => `it("button case ${n}", () => { open("<ui-button>"); });`).join("\n") };
  const bounded = automaticChecks(expanded, ["packages/looma/src/components/ui-button/ui-button.html"]);
  assert.ok(Object.values(bounded.browserTests).flat().length <= 80);
  assert.ok(bounded.deferred.length > 0);
  assert.deepEqual(bounded.nativeTests, focused.nativeTests);
});

test("global changes use explicit integration smoke cases and retain edited regressions", () => {
  const smoke = 'HTML components register and lower from dist/index.js';
  const source = { ...files, "packages/looma/tests/browser.test.ts": `describe("HTML components", () => { it("register and lower from dist/index.js", () => {}); });\nit("changed regression", () => {});` };
  const broad = automaticChecks(source, ["pnpm-lock.yaml"]);
  assert.deepEqual(broad.browserTests["packages/looma/tests/browser.test.ts"], [smoke]);
  assert.ok(broad.deferred.some(entry => entry.name === "changed regression"));
  const edited = automaticChecks(source, ["pnpm-lock.yaml", "packages/looma/tests/browser.test.ts"], { "packages/looma/tests/browser.test.ts": [[2, 2]] });
  assert.ok(edited.browserTests["packages/looma/tests/browser.test.ts"].includes("changed regression"));
});


test("the global smoke list maps to real Looma integration cases", () => {
  const actual = snapshot("HEAD", true);
  for (const [file, names] of Object.entries(smokeCases)) {
    const discovered = testCases(actual[file]).map(entry => entry.name);
    for (const name of names) assert.ok(discovered.includes(name), `${file}: ${name}`);
  }
  const mixed = automaticChecks(actual, ["pnpm-lock.yaml", "packages/looma/src/components/ui-badge/ui-badge.html"]);
  assert.ok(mixed.browserTests["packages/looma/tests/browser.test.ts"].includes("Combobox chip truncation keeps short ${adapter} chip text and descenders visible at desktop and 375px"));
});


test("selection uses the tested PR merge base and main push before revision", () => {
  const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
  const head = git("rev-parse", "HEAD"), parent = git("rev-parse", "HEAD^");
  assert.equal(changeBase({ pull_request: { base: { sha: head } }, before: "ignored" }, head), head);
  assert.equal(changeBase({ before: parent }, head), parent);
  assert.equal(changeBase({ before: "0".repeat(40) }, head), parent);
});


test("CI recipe changes exercise the real package, browser smoke and documentation paths", () => {
  const actual = snapshot("HEAD", true);
  for (const file of [".github/workflows/ci.yml", ".github/workflows/docs-parity.yml", "tools/scripts/ci-selection.mjs", "tools/scripts/ci-qualification.mjs"]) {
    const plan = automaticChecks(actual, [file]);
    assert.equal(plan.full, true, file);
    assert.equal(plan.packageConsumer, true, file);
    assert.equal(plan.docsBuild, true, file);
    assert.ok(Object.keys(plan.nativeTests).length > 0, file);
    assert.deepEqual([...plan.browserTests["packages/looma/tests/browser.test.ts"]].sort(), [...smokeCases["packages/looma/tests/browser.test.ts"]].sort(), file);
  }
});
