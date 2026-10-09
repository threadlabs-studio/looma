import { createHash } from "node:crypto";
import path from "node:path";

export const stages = { ci: ["quality", "package-consumer"], docs: ["docs-behavior", "docs-visual"] };
export const workflowPaths = { ci: ".github/workflows/ci.yml", docs: ".github/workflows/docs-parity.yml" };
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const componentOf = (file) => /^packages\/looma\/src\/components\/(ui-[\w-]+)\//.exec(file)?.[1];
const globalInput = (file) => /^(?:pnpm-lock\.yaml|package\.json|pnpm-workspace\.yaml|packages\/looma\/(?:build\.mjs|package\.json|tsconfig[^/]*|src\/(?:tokens\/|env\.d\.ts))|tools\/(?:tsconfig\/|style-source-allowlist\.json|scripts\/style-source-policy\.mjs))/.test(file);
const buildTool = (file) => /^tools\/(?:style-source-allowlist\.json|scripts\/style-source-policy\.mjs)$/.test(file);
const docsTool = (file) => /^tools\/scripts\/(?:generate-component-api|component-api-generator|docs-coverage)\.mjs$/.test(file);
const releaseTool = (file) => /^tools\/scripts\/(?:verify-packages|verify-facade-consumer|release-config|create-release-manifest|managed-process)\.mjs$/.test(file);
const componentNames = (tag) => [tag, tag.slice(3).split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(""), "Ui" + tag.slice(3).split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join("")];
const references = (source, tag) => componentNames(tag).some((name) => new RegExp(`(?<![\\w-])${escape(name)}(?![\\w-])`).test(source));
const renders = (source, tag) => new RegExp(`<${escape(tag)}(?=[\\s/>])|["'](?:[^"']*/)?${escape(tag)}(?:/[^"']*)?["']|(?:<|\\bh\\(\\s*)${escape(componentNames(tag)[1])}(?=[\\s,/>])`).test(source);
const routeFor = (files, file) => {
  const coverage = JSON.parse(files["apps/docs/tests/coverage.json"] ?? '{"pages":[]}');
  const declared = coverage.pages.find((page) => page.source === file)?.path;
  const slug = /^slug:\s*\/?(.*?)\s*$/m.exec(files[file] ?? "")?.[1];
  return declared ?? (slug === "" ? "./" : slug) ?? file.replace(/^apps\/docs\/docs\//, "").replace(/\.(?:md|mdx)$/, "").replace(/^index$/, "./");
};

/** Include every authored consumer of a changed primitive, including example compositions. */
export function affectedModules(files, initial) {
  const affected = new Set(initial);
  for (let grew = true; grew;) {
    grew = false;
    for (const [file, source] of Object.entries(files)) {
      if (affected.has(file)) continue;
      const imports = [...source.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\bhref\s*=\s*|\bcontroller\s*=\s*)["']((?:\.|@site\/)[^"']+)["']/g)].map((match) => match[1].startsWith("@site/") ? "apps/docs/" + match[1].slice(6) : path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1])));
      if (imports.some((dependency) => [dependency, dependency.replace(/\.js$/, ".ts"), dependency + ".ts", dependency + ".tsx", dependency + ".js", dependency + "/index.ts"].some((candidate) => affected.has(candidate)))) { affected.add(file); grew = true; }
    }
  }
  return [...affected].sort();
}
export function affectedComponents(files, initial, examples = false) {
  const affected = new Set(initial);
  const seeds = new Set(initial);
  const components = [...new Set(Object.keys(files).map(componentOf).filter(Boolean))];
  for (let grew = true; grew;) {
    grew = false;
    for (const tag of components) {
      if (affected.has(tag)) continue;
      const source = Object.entries(files).filter(([file]) => componentOf(file) === tag && (examples || !file.includes("/examples/"))).map(([, text]) => text).join("\n");
      if ([...(examples ? seeds : affected)].some((dependency) => renders(source, dependency))) { affected.add(tag); grew = true; }
    }
  }
  return [...affected].sort();
}

/** Static cases in shared suites keep independent primitives out of a focused run. */
export function testCases(source) {
  const starts = [...source.matchAll(/\b(?:it|test)(?:\.(?:each|for)\([^\n]+\))?\(\s*(["'])(.*?)\1\s*,/g)];
  return starts.map((match) => {
    const open = source.lastIndexOf("(", source.indexOf(match[1] + match[2] + match[1], match.index));
    let depth = 0, quote = null, end = source.length;
    for (let index = open; index < source.length; index++) {
      const char = source[index];
      if (quote) { if (char === "\\") index++; else if (char === quote) quote = null; continue; }
      if (char === '"' || char === "'" || char === "`") { quote = char; continue; }
      if (source.startsWith("//", index)) { index = source.indexOf("\n", index); if (index < 0) break; continue; }
      if (source.startsWith("/*", index)) { index = source.indexOf("*/", index + 2) + 1; if (index < 1) break; continue; }
      if (char === "(") depth++;
      if (char === ")" && --depth === 0) { end = index + 1; break; }
    }
    return { title: match[2], start: source.slice(0, match.index).split("\n").length, end: source.slice(0, end).split("\n").length, source: source.slice(match.index, end) };
  });
}

/** Select owned checks; an unknown executable input blocks instead of quietly losing coverage. */
export function selectChecks(files, changes, hunks = {}) {
  const modules = affectedModules(files, changes);
  const componentChanges = [...new Set(modules.map(componentOf).filter(Boolean))];
  const editor = modules.some((file) => /^packages\/looma\/src\/(?:editor|vue\/editor)\//.test(file));
  const unknownShared = changes.some((file) => file.startsWith("packages/looma/src/components/shared/") && !modules.some(componentOf));
  const full = changes.some(globalInput) || unknownShared || changes.some((file) => /^packages\/looma\/src\/vue\/(?!editor\/)/.test(file));
  const docsFull = full || changes.some(docsTool) || changes.some((file) => /^apps\/docs\/(?:src\/|static\/|docusaurus|sidebars|package\.json|playwright|scripts\/)/.test(file));
  const components = affectedComponents(files, [...componentChanges, ...(editor ? Object.keys(files).map(componentOf).filter((tag) => tag?.startsWith("ui-editor-")) : [])]);
  const docsComponents = affectedComponents(files, components, true);
  const packageTests = {};
  const scripts = new Set();
  const docsRoutes = new Set();
  const docsCases = new Set();
  const changedDocsTests = [];
  for (const file of changes) {
    if (componentOf(file) || globalInput(file) || /^packages\/looma\/(?:src\/(?:editor|vue)\/|src\/components\/shared\/|tests\/|vitest)/.test(file)) continue;
    if (/^tools\/scripts\//.test(file)) {
      if (file.endsWith(".test.mjs")) scripts.add(file);
      const ownTest = file.replace(/\.mjs$/, ".test.mjs");
      if (files[ownTest]) scripts.add(ownTest);
      for (const [testFile, source] of Object.entries(files)) {
        if (testFile.endsWith(".test.mjs") && source.includes(file.split("/").at(-1))) scripts.add(testFile);
      }
      continue;
    }
    if (/^apps\/docs\/tests\//.test(file)) { changedDocsTests.push(file); continue; }
    if (/^apps\/docs\/docs\//.test(file)) { docsRoutes.add(routeFor(files, file)); continue; }
    if (/^apps\/storybook\//.test(file) || /^(?:CHANGELOG\.md|README\.md|AGENTS\.md|CLAUDE\.md|LICENSE|docs\/|\.github\/|\.gitignore|dprint\.json|\.compound-engineering\/)/.test(file)) continue;
    if (/^(?:tests\/release\/|tools\/data\/|tools\/[^/]+\.json|packages\/looma\/README\.md)/.test(file)) continue;
    throw new Error(`Unmapped qualification input: ${file}`);
  }
  for (const [file, source] of Object.entries(files)) {
    if (/^tools\/scripts\/.*\.test\.mjs$/.test(file) && (modules.includes(file) || components.some((tag) => references(source, tag)))) scripts.add(file);
    if (/^packages\/looma\/tests\/.*\.test\.ts$/.test(file)) {
      const cases = testCases(source);
      const changed = changes.includes(file) || modules.includes(file);
      const selected = cases.filter((entry) => full || (changed && (!hunks[file] || hunks[file].some(([start, end]) => start <= entry.end && end >= entry.start)))
        || components.some((tag) => references(entry.source, tag)) || (editor && /editor|mention/i.test(file)));
      if (selected.length) packageTests[file] = selected.map(({ title }) => title);
      else if ((changed || full || components.some((tag) => references(source, tag))) && !cases.length) packageTests[file] = null;
      // A named import alias or an indirect shared harness cannot be safely mapped by spelling.
      else if (modules.includes(file) && !selected.length) packageTests[file] = null;
    }
    if (/^apps\/docs\/docs\//.test(file) && (docsComponents.some((tag) => renders(source, tag))
      || (!/^slug:\s*\/(?:components|parts)\//m.test(source) && components.some((tag) => references(source, tag))))) docsRoutes.add(routeFor(files, file));
    if (/^apps\/docs\/tests\/.*\.spec\.ts$/.test(file)) {
      for (const entry of testCases(source)) if (docsComponents.some((tag) => references(entry.source, tag)) || (editor && /editor/.test(entry.source))) docsCases.add(entry.title);
    }
  }
  for (const tag of docsComponents) docsRoutes.add(`components/${tag}`);
  const renderedModules = Object.entries(files).filter(([file, source]) => /^apps\/docs\/src\//.test(file) && components.some((tag) => renders(source, tag))).map(([file]) => file);
  for (const file of affectedModules(files, renderedModules)) if (file.startsWith("apps/docs/docs/")) docsRoutes.add(routeFor(files, file));
  if (docsComponents.length) docsRoutes.add("components"); // The catalog renders authored examples.
  if (editor) docsRoutes.add("editor");
  if (full) for (const file of Object.keys(files)) if (/^tools\/scripts\/.*\.test\.mjs$/.test(file)) scripts.add(file);
  if (changes.some((file) => /^\.github\//.test(file))) {
    for (const file of ["tools/scripts/ci-selection.test.mjs", "tools/scripts/release-qualification-policy.test.mjs", "tools/scripts/release-workflow-policy.test.mjs"]) if (files[file]) scripts.add(file);
  }
  const patterns = [...docsRoutes].map((route) => `(?:^| )${escape(route)}:`).concat(docsComponents.map((tag) => `(?:^| )${escape(tag)}:`), [...docsCases].map(escape));
  const docsTests = {};
  const sharedDocsTest = changedDocsTests.some((file) => /\/tests\/(?:docs-fixture|interaction-cases|accessibility)\.ts$|\/tests\/fixtures\/|\/tests\/coverage\.json$/.test(file));
  for (const [file, source] of Object.entries(files)) if (/^apps\/docs\/tests\/.*\.spec\.ts$/.test(file)) {
    if (docsFull || sharedDocsTest) { docsTests[file] = null; continue; }
    const cases = testCases(source);
    const changed = changes.includes(file);
    const own = changed ? cases.filter((entry) => !hunks[file] || hunks[file].some(([start, end]) => start <= entry.end && end >= entry.start)).map(({ title }) => escape(title)) : [];
    // Generated page/state cases have stable route prefixes; shared definitions own their whole file.
    if (changed && !cases.length) { docsTests[file] = null; continue; }
    if (patterns.length || own.length) docsTests[file] = [...patterns, ...own].join("|");
  }
  for (const baseline of changedDocsTests.filter((file) => file.includes("/baselines/"))) {
    const tag = /\b(ui-[\w-]+?)(?:--|\.png)/.exec(baseline)?.[1];
    const pattern = tag ? `(?:^| )${escape(tag)}:|components/${escape(tag)}:` : null;
    const visual = "apps/docs/tests/visual.spec.ts";
    if (!pattern) throw new Error(`Unmapped visual baseline: ${baseline}`);
    docsTests[visual] = [docsTests[visual], pattern].filter(Boolean).join("|");
  }
  return { full, docsFull, components, docsComponents, packageTests, scripts: [...scripts].sort(), docsRoutes: [...docsRoutes].sort(), docsGrep: patterns.join("|"), docsTests, changedDocsTests,
    storybook: full || changes.some((file) => file.startsWith("apps/storybook/")), source: full || componentChanges.length > 0 || editor,
    docs: docsFull || patterns.length > 0 || changedDocsTests.length > 0 };
}

/** Test changes invalidate only their owner; generated artifacts and Git history are not inputs. */
export function stageInputs(files, stage) {
  if (!Object.values(stages).flat().includes(stage)) throw new Error(`Unknown stage ${stage}`);
  return Object.fromEntries(Object.entries(files).filter(([file]) => {
    if (/^(?:package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|tools\/tsconfig\/)/.test(file)) return true;
    if (stage === "quality") return /^(?:packages\/looma\/|tools\/|apps\/storybook\/)/.test(file) && !/^packages\/looma\/README/.test(file);
    if (stage === "package-consumer") return /^(?:packages\/looma\/(?:src\/|build\.mjs|package\.json|README|tsconfig)|tests\/release\/)/.test(file) || buildTool(file) || releaseTool(file);
    if (/^packages\/looma\/(?:src\/|build\.mjs|package\.json)/.test(file) || buildTool(file) || docsTool(file)) return true;
    if (!file.startsWith("apps/docs/")) return false;
    if (stage === "docs-behavior") return !/\/baselines\/|\/visual\.spec\.ts$/.test(file);
    if (/\/tests\//.test(file)) return /\/visual\.spec\.ts$|\/baselines\/|\/fixtures\/|\/(?:docs-fixture|interaction-cases|accessibility)\.ts$|\/coverage\.json$/.test(file);
    return true;
  }).sort(([left], [right]) => left.localeCompare(right)));
}

export function fingerprint(inputs) {
  const hash = createHash("sha256");
  for (const [file, contents] of Object.entries(inputs).sort(([a], [b]) => a.localeCompare(b))) hash.update(`${file}\0${contents}\0`);
  return hash.digest("hex");
}

export function validateProvider(run, identity) {
  if (run.status !== "completed" || run.conclusion !== "success" || String(run.id) !== identity.runId || String(run.run_attempt) !== identity.attempt
    || run.head_sha !== (identity.providerRevision ?? identity.revision) || run.head_repository?.full_name !== identity.repository || run.path !== workflowPaths[identity.workflow]
    || !["pull_request", "push", "workflow_dispatch"].includes(run.event)) throw new Error("Provider proof identity or success does not match");
}

export function validateReceipt(receipt, identity, contract, inputs) {
  if (receipt.version !== 1 || receipt.contract !== contract || Object.entries(identity).some(([key, value]) => receipt[key] !== value)
    || Object.entries(inputs).some(([stage, hash]) => receipt.stages?.[stage]?.passed !== true || receipt.stages[stage].fingerprint !== hash)) throw new Error("Receipt identity, contract or stage inputs do not match");
}

const reportTests = (report) => {
  const result = [];
  const visit = (suite) => { for (const spec of suite.specs ?? []) for (const entry of spec.tests ?? []) result.push({ id: `${spec.id}:${entry.projectName}`, entry }); for (const child of suite.suites ?? []) visit(child); };
  for (const suite of report.suites ?? []) visit(suite);
  return result.sort((a, b) => a.id.localeCompare(b.id));
};
export function validateBrowserReport(discovery, report) {
  const expected = reportTests(discovery), actual = reportTests(report);
  if (!expected.length) throw new Error("Empty browser discovery");
  if (report.errors?.length || JSON.stringify(expected.map(({ id }) => id)) !== JSON.stringify(actual.map(({ id }) => id))) throw new Error("Browser report does not match discovery");
  if (actual.some(({ entry }) => !entry.results?.length || entry.results.some((result) => result.status !== "passed"))) throw new Error("Every selected browser test must have passed without skips or retries");
  return actual.map(({ id }) => id);
}
