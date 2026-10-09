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
function calls(source, names) {
  const starts = [...source.matchAll(new RegExp("\\b(?:" + names + ")(?:\\.(?:each|for)\\([^\\n]+\\))?\\(\\s*([\"'`])(.*?)\\1\\s*,", "g"))];
  return starts.map((match) => {
    const open = source.lastIndexOf("(", source.indexOf(match[1] + match[2] + match[1], match.index));
    let depth = 0, quote = null, end = source.length;
    for (let index = open; index < source.length; index++) {
      const char = source[index];
      if (quote) { if (char === "\\") index++; else if (char === quote) quote = null; continue; }
      if (char === '"' || char === "'" || char === "`") { quote = char; continue; }
      if (source.startsWith("//", index)) { index = source.indexOf("\n", index); if (index < 0) break; continue; }
      if (source.startsWith("/*", index)) { index = source.indexOf("*/", index + 2) + 1; if (index < 1) break; continue; }
      if (char === "/" && /[=(:,\[!|&?;{}]$/.test(source.slice(open, index).trimEnd())) {
        let characterClass = false;
        for (index++; index < source.length; index++) {
          if (source[index] === "\\") { index++; continue; }
          if (source[index] === "[") characterClass = true;
          if (source[index] === "]") characterClass = false;
          if (source[index] === "/" && !characterClass) break;
        }
        continue;
      }
      if (char === "(") depth++;
      if (char === ")" && --depth === 0) { end = index + 1; break; }
    }
    return { title: match[2], dynamic: /\$\{|%(?:[sdifjo]|#)/.test(match[2]), start: source.slice(0, match.index).split("\n").length, end: source.slice(0, end).split("\n").length, source: source.slice(match.index, end) };
  });
}
export const testCases = (source) => {
  const scopes = calls(source, "describe");
  return calls(source, "it|test").map((entry) => ({ ...entry, name: [...scopes.filter((scope) => scope.start <= entry.start && scope.end >= entry.end).sort((a, b) => a.start - b.start).map(({ title }) => title), entry.title].join(" ") }));
};
export const caseNamePattern = (names) => "^(?:" + names.map((name) => name.split(/\$\{[^}]+\}|%(?:[sdifjo]|#)/).map(escape).join(".+?")).join("|") + ")$";
function editedCases(source, hunks) {
  const cases = testCases(source);
  if (!hunks) return cases;
  const selected = new Set();
  const scopes = calls(source, "describe");
  for (const [start, end] of hunks) {
    const direct = cases.filter((entry) => start <= entry.end && end >= entry.start);
    for (const entry of direct) selected.add(entry);
    if (direct.length && direct.some((entry) => start >= entry.start && end <= entry.end)) continue;
    // Changed shared setup/helpers affect the enclosing suite; imports own the complete file.
    const scope = scopes.filter((entry) => start >= entry.start && end <= entry.end).sort((a, b) => (a.end - a.start) - (b.end - b.start))[0];
    for (const entry of scope ? cases.filter((entry) => entry.start >= scope.start && entry.end <= scope.end) : cases) selected.add(entry);
  }
  if (hunks.length && cases.length && !selected.size) throw new Error("Unmapped changed test hunks");
  return [...selected];
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
  const nativeConfig = changes.includes("packages/looma/vitest.config.ts");
  const browserConfig = changes.includes("packages/looma/vitest.browser.config.ts");
  const packageTests = {};
  const scripts = new Set();
  const docsRoutes = new Set();
  const docsCases = new Set();
  const changedDocsTests = [];
  for (const file of changes) {
    if (componentOf(file) || globalInput(file) || /^packages\/looma\/(?:src\/(?:editor|vue)\/|src\/components\/shared\/|tests\/|vitest)/.test(file)) continue;
    if (/^tools\/scripts\//.test(file)) {
      let owned = false;
      if (file.endsWith(".test.mjs") && files[file]) { scripts.add(file); owned = true; }
      const ownTest = file.replace(/\.mjs$/, ".test.mjs");
      if (files[ownTest]) { scripts.add(ownTest); owned = true; }
      for (const [testFile, source] of Object.entries(files)) {
        if (testFile.endsWith(".test.mjs") && (source.includes(file.split("/").at(-1)) || modules.includes(testFile))) { scripts.add(testFile); owned = true; }
      }
      if (files[file] && !owned && !docsTool(file) && !releaseTool(file) && !buildTool(file)) throw new Error(`Unmapped executable script: ${file}`);
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
      const edited = changed ? editedCases(source, hunks[file]) : [];
      const selected = cases.filter((entry) => full || (nativeConfig && !file.endsWith(".browser.test.ts")) || (browserConfig && file.endsWith(".browser.test.ts")) || edited.some((change) => change.start === entry.start)
        || components.some((tag) => references(entry.source, tag)) || (editor && /editor|mention/i.test(file)));
      if (selected.length) packageTests[file] = selected.map(({ name }) => name);
      else if ((changed || full || (nativeConfig && !file.endsWith(".browser.test.ts")) || (browserConfig && file.endsWith(".browser.test.ts")) || components.some((tag) => references(source, tag))) && !cases.length) packageTests[file] = null;
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
  const scriptTests = {};
  for (const file of scripts) {
    const cases = testCases(files[file]);
    if (changes.includes(file)) scriptTests[file] = editedCases(files[file], hunks[file]).map(({ name }) => name);
    else if (modules.includes(file) || components.length || full) scriptTests[file] = null;
    else if (file.endsWith("ci-selection.test.mjs")) scriptTests[file] = null;
    else if (file.endsWith("release-qualification-policy.test.mjs")) scriptTests[file] = cases.filter(({ source }) => source.includes(".github/workflows/ci.yml")).map(({ name }) => name);
    else if (file.endsWith("release-workflow-policy.test.mjs")) scriptTests[file] = cases.filter(({ source }) => /ciWorkflow|releasePackagingJob/.test(source)).map(({ name }) => name);
    else scriptTests[file] = null;
    if (scriptTests[file]?.length === 0) { if (!cases.length) scriptTests[file] = null; else delete scriptTests[file]; }
  }
  const patterns = [...docsRoutes].map((route) => `(?:^| )${escape(route)}:`).concat(docsComponents.map((tag) => `(?:^| )${escape(tag)}:`), [...docsCases].map(escape));
  const docsTests = {};
  const sharedDocsTest = changedDocsTests.some((file) => /\/tests\/(?:docs-fixture|interaction-cases|accessibility)\.ts$|\/tests\/fixtures\/|\/tests\/coverage\.json$/.test(file));
  for (const [file, source] of Object.entries(files)) if (/^apps\/docs\/tests\/.*\.spec\.ts$/.test(file)) {
    if (docsFull || sharedDocsTest) { docsTests[file] = null; continue; }
    const cases = testCases(source);
    const changed = changes.includes(file);
    const edited = changed ? editedCases(source, hunks[file]) : [];
    const own = edited.map(({ title }) => escape(title));
    // Generated page/state cases have stable route prefixes; shared definitions own their whole file.
    if (changed && (!cases.length || edited.some((entry) => entry.dynamic))) { docsTests[file] = null; continue; }
    if (patterns.length || own.length) docsTests[file] = [...patterns, ...own].join("|");
  }
  for (const baseline of changedDocsTests.filter((file) => file.includes("/baselines/"))) {
    const tag = /\b(ui-[\w-]+?)(?:--|\.png)/.exec(baseline)?.[1];
    const pattern = tag ? `(?:^| )${escape(tag)}:|components/${escape(tag)}:` : null;
    const visual = "apps/docs/tests/visual.spec.ts";
    if (!pattern) throw new Error(`Unmapped visual baseline: ${baseline}`);
    docsTests[visual] = [docsTests[visual], pattern].filter(Boolean).join("|");
  }
  return { full, docsFull, components, docsComponents, packageTests, scripts: Object.keys(scriptTests).sort(), scriptTests, docsRoutes: [...docsRoutes].sort(), docsGrep: patterns.join("|"), docsTests, changedDocsTests,
    storybook: full || changes.some((file) => file.startsWith("apps/storybook/")), source: full || componentChanges.length > 0 || editor,
    docs: docsFull || patterns.length > 0 || changedDocsTests.length > 0 };
}

/** Test changes invalidate only their owner; generated artifacts and Git history are not inputs. */
export function stageInputs(files, stage) {
  if (!Object.values(stages).flat().includes(stage)) throw new Error(`Unknown stage ${stage}`);
  return Object.fromEntries(Object.entries(files).filter(([file]) => {
    if (/^(?:package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|tools\/tsconfig\/)/.test(file)) return true;
    if (stage === "quality") return /^(?:packages\/looma\/|tools\/|apps\/storybook\/|\.github\/workflows\/)/.test(file) && !/^packages\/looma\/README/.test(file);
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
    || run.repository?.full_name !== identity.repository || run.head_repository.id !== run.repository.id || !["pull_request", "push"].includes(run.event)) throw new Error("Provider proof identity or success does not match");
}

export function checkoutRevision(log) {
  const matches = [...log.matchAll(/git log -1 --format=['"]?%H['"]?\r?\n[^\n]*?\s([a-f0-9]{40})\r?\n/g)];
  if (matches.length !== 1) throw new Error("Provider logs must identify one actual checkout revision");
  return matches[0][1];
}
export function validateCheckout(provider, revision, parents, mainAncestor) {
  if (provider.event === "push" && revision === provider.head_sha) return;
  const pr = provider.pull_requests?.[0];
  // GitHub drops the mutable PR association after a merge; immutable run head and ancestry remain.
  if (provider.event !== "pull_request" || (provider.pull_requests?.length ?? 0) > 1 || provider.head_repository.id !== provider.repository.id
    || (pr && (pr.base.ref !== "main" || pr.head.repo.id !== provider.repository.id || pr.base.repo.id !== provider.repository.id))
    || parents.length !== 2 || parents[1] !== provider.head_sha || !mainAncestor) throw new Error("Provider checkout does not retain the trusted execution head and main ancestry");
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
export const browserTestIds = (report) => reportTests(report).map(({ id }) => id);
export function validateNodeReport(report, names) {
  if (!names?.length) throw new Error("Empty selected Node discovery");
  const scopes = [], results = [];
  for (const line of report.split("\n")) {
    const subtest = /^(\s*)# Subtest: (.*)$/.exec(line);
    if (subtest) {
      const depth = subtest[1].length;
      while (scopes.length && scopes.at(-1).depth >= depth) scopes.pop();
      scopes.push({ depth, name: subtest[2] });
    }
    const result = /^(\s*)(ok|not ok) \d+ - (.*)$/.exec(line);
    if (result) {
      while (scopes.length && scopes.at(-1).depth > result[1].length) scopes.pop();
      results.push({ name: scopes.map((scope) => scope.name).join(" "), passed: result[2] === "ok" && !/ # (?:SKIP|TODO)\b/.test(result[3]) });
    }
  }
  const patterns = names.map((name) => new RegExp(caseNamePattern([name])));
  const actual = results.filter((entry) => patterns.some((pattern) => pattern.test(entry.name)));
  if (patterns.some((pattern) => !actual.some((entry) => pattern.test(entry.name))) || actual.some((entry) => !entry.passed)) throw new Error("Selected Node cases are missing, skipped or failed");
  return actual.map(({ name }) => name).sort();
}
export function validateVitestReport(report, names) {
  const assertions = (report.testResults ?? []).flatMap((suite) => suite.assertionResults ?? []);
  const patterns = names?.map((name) => new RegExp(caseNamePattern([name])));
  const actual = assertions.filter((entry) => !patterns || patterns.some((pattern) => pattern.test(entry.fullName)));
  if (!actual.length || patterns?.some((pattern) => !actual.some((entry) => pattern.test(entry.fullName)))) throw new Error("Empty or incomplete selected Vitest discovery");
  if (actual.some((entry) => entry.status !== "passed") || report.success !== true) throw new Error("Every selected Vitest case must have passed");
  return actual.map(({ fullName }) => fullName).sort();
}
export function validateBrowserReport(discovery, report) {
  const expected = reportTests(discovery), actual = reportTests(report);
  if (!expected.length) throw new Error("Empty browser discovery");
  if (report.errors?.length || JSON.stringify(expected.map(({ id }) => id)) !== JSON.stringify(actual.map(({ id }) => id))) throw new Error("Browser report does not match discovery");
  if (actual.some(({ entry }) => !entry.results?.length || entry.results.some((result) => result.status !== "passed"))) throw new Error("Every selected browser test must have passed without skips or retries");
  return actual.map(({ id }) => id);
}

/** One admission decision counts both workflows, setup and proof, before either starts checks. */
export function qualificationMinutes(plans, files) {
  let minutes = 4; // Six hosted jobs: checkout/setup, provider reads, receipt upload/download and gate.
  const quality = plans.ci;
  if (!quality.stages.quality.reused) {
    const selection = quality.selection;
    const build = selection.source || selection.storybook || Object.keys(selection.packageTests).length > 0;
    minutes += 1.25; // Dependency installation, including script readers that require package tooling.
    if (build) minutes += 1.25;
    if (selection.source) minutes += 0.5;
    if (selection.storybook) minutes += 1.5;
    for (const [file, names] of Object.entries(selection.packageTests)) {
      const cases = names ?? testCases(files[file]).map(({ name }) => name);
      if (!cases.length) return Infinity; // Unknown generated discovery needs an explicit owner mapping.
      minutes += cases.reduce((count, name) => count + (/\$\{|%(?:[sdifjo]|#)/.test(name) ? 3 : 1), 0) * (/browser\.test\.ts$/.test(file) ? 5 : 0.1) / 60;
    }
    minutes += selection.scripts.length / 60;
  }
  if (!quality.stages["package-consumer"].reused) minutes += 3.5;
  const docs = plans.docs;
  if (Object.values(docs.stages).some((stage) => !stage.reused)) minutes += 2; // Install, package/docs build, coverage and test typecheck.
  const pages = JSON.parse(files["apps/docs/tests/coverage.json"] ?? '{"pages":[]}').pages;
  const states = [...(files["apps/docs/tests/interaction-cases.ts"] ?? "").matchAll(/component:\s*"(ui-[\w-]+)"[^\n]*name:\s*"([^"]+)"/g)].map((match) => `${match[1]}: ${match[2]}`);
  for (const stage of ["docs-behavior", "docs-visual"]) {
    if (docs.stages[stage].reused) continue;
    const visual = stage === "docs-visual";
    for (const [file, grep] of Object.entries(docs.selection.docsTests).filter(([file]) => visual === file.endsWith("visual.spec.ts"))) {
      const accepts = (title) => !grep || new RegExp(grep).test(title);
      for (const entry of testCases(files[file])) {
        let cases = 0;
        if (entry.title.startsWith("${doc.path}")) cases = pages.filter((page) => accepts(`${page.path}: content`)).length;
        else if (entry.title.startsWith("${state.component}")) cases = states.filter(accepts).length * (visual ? 1 : 2);
        else if (entry.dynamic) return Infinity;
        else if (accepts(entry.title)) cases = 1;
        // Visual cases each read three lenses; behavior runs in three engines, with one worker.
        minutes += cases * (visual ? 4 * 15 : 3 * 2.5) / 60;
      }
    }
  }
  return Math.ceil(minutes * 10) / 10;
}
export function admitQualification(plans, files, limit = 15) {
  const minutes = qualificationMinutes(plans, files);
  if (!Number.isFinite(minutes) || minutes > limit) throw new Error(`Selected qualification exceeds ${limit} aggregate runner minutes (${minutes}); narrow the owned checks or obtain explicit global qualification. No automatic full sweep.`);
  return { estimatedMinutes: minutes, limit };
}
