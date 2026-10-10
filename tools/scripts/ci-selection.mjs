import path from "node:path";

export const isBrowserTest = (file, source = "") => /(?:^|\/)browser\.test\.ts$|\.browser\.test\.ts$/.test(file) || /\bfrom\s*["']playwright["']/.test(source);
export const vitestConfiguration = (file) => file.endsWith(".browser.test.ts") ? "vitest.browser.config.ts" : "vitest.config.ts";
export const vitestArguments = (file, names, report) => ["--filter", "@threadlabs/looma", "exec", "vitest", "run", file.replace(/^packages\/looma\//, ""),
  "--config", vitestConfiguration(file), ...(names ? ["--testNamePattern", caseNamePattern(names)] : []), "--maxWorkers=1", "--fileParallelism=false", "--passWithNoTests=false", "--reporter=json", `--outputFile=${report}`];
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const componentOf = (file) => /^packages\/looma\/src\/components\/(ui-[\w-]+)\//.exec(file)?.[1];
const globalInput = (file) => /^(?:pnpm-lock\.yaml|package\.json|pnpm-workspace\.yaml|packages\/looma\/(?:build\.mjs|package\.json|tsconfig[^/]*|src\/(?:tokens\/|env\.d\.ts))|tools\/(?:tsconfig\/|style-source-allowlist\.json|scripts\/style-source-policy\.mjs))/.test(file);
const buildTool = (file) => /^tools\/(?:style-source-allowlist\.json|scripts\/style-source-policy\.mjs)$/.test(file);
const docsTool = (file) => /^tools\/scripts\/(?:generate-component-api|component-api-generator|docs-coverage)\.mjs$/.test(file);
const releaseTool = (file) => /^tools\/scripts\/(?:verify-packages|verify-facade-consumer|release-config|create-release-manifest|managed-process)\.mjs$/.test(file);
const ciRecipe = (file) => /^\.github\/workflows\/(?:ci|docs-parity)\.yml$|^tools\/scripts\/ci-(?:selection|qualification)\.mjs$/.test(file);
const componentNames = (tag) => [tag, tag.slice(3).split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(""), "Ui" + tag.slice(3).split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join("")];
const references = (source, tag) => componentNames(tag).some((name) => new RegExp(`(?<![\\w-])${escape(name)}(?![\\w-])`).test(source));
const renders = (source, tag) => new RegExp(`<${escape(tag)}(?=[\\s/>])|["'](?:[^"']*/)?${escape(tag)}(?:/[^"']*)?["']|(?:<|\\bh\\(\\s*)${escape(componentNames(tag)[1])}(?=[\\s,/>])`).test(source);
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
function codePositions(source) {
  const positions = new Uint8Array(source.length);
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '"' || char === "'" || char === "`") {
      for (index++; index < source.length; index++) {
        if (source[index] === "\\") index++;
        else if (source[index] === char) break;
      }
      continue;
    }
    if (source.startsWith("//", index)) { const end = source.indexOf("\n", index); index = end < 0 ? source.length : end; continue; }
    if (source.startsWith("/*", index)) { const end = source.indexOf("*/", index + 2); index = end < 0 ? source.length : end + 1; continue; }
    positions[index] = 1;
  }
  return positions;
}
function calls(source, names) {
  const positions = codePositions(source);
  const starts = [...source.matchAll(new RegExp("\\b(?:" + names + ")(?:\\.(?:each|for)\\([^\\n]+\\))?\\(\\s*([\"'`])(.*?)\\1\\s*,", "g"))].filter((match) => positions[match.index]);
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
  const lines = source.split("\n");
  for (const [start, end] of hunks) {
    const direct = cases.filter((entry) => start <= entry.end && end >= entry.start);
    for (const entry of direct) selected.add(entry);
    // A diff hunk can include complete suites and the blank line between them.
    // Attribute setup lines individually so that boundary never owns another suite.
    for (let line = start; line <= end; line++) {
      if (!lines[line - 1]?.trim() || direct.some(entry => line >= entry.start && line <= entry.end)) continue;
      // Changed shared setup/helpers affect their enclosing suite; imports own the file.
      const scope = scopes.filter(entry => line >= entry.start && line <= entry.end).sort((a, b) => (a.end - a.start) - (b.end - b.start))[0];
      for (const entry of scope ? cases.filter(entry => entry.start >= scope.start && entry.end <= scope.end) : cases) selected.add(entry);
    }
  }
  if (hunks.length && cases.length && !selected.size) throw new Error("Unmapped changed test hunks");
  return [...selected];
}

/** Select Looma-owned behavior. Unknown executable inputs still need an explicit mapping. */
export function selectChecks(files, changes, hunks = {}) {
  const modules = affectedModules(files, changes);
  const runtimeModules = modules.filter(file => !file.includes("/examples/"));
  const componentChanges = [...new Set(runtimeModules.map(componentOf).filter(Boolean))];
  const editor = runtimeModules.some(file => /^packages\/looma\/src\/(?:editor|vue\/editor)\//.test(file));
  const unknownShared = changes.some(file => file.startsWith("packages/looma/src/components/shared/") && !runtimeModules.some(componentOf));
  const full = changes.some(globalInput) || changes.some(ciRecipe) || unknownShared || changes.some(file => /^packages\/looma\/src\/vue\/(?!editor\/)/.test(file));
  const components = affectedComponents(files, [...componentChanges, ...(editor ? Object.keys(files).map(componentOf).filter(tag => tag?.startsWith("ui-editor-")) : [])]);
  const nativeConfig = changes.includes("packages/looma/vitest.config.ts");
  const browserConfig = changes.includes("packages/looma/vitest.browser.config.ts");
  const packageTests = {}, scripts = new Set();
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
    if (/^apps\/|^(?:CHANGELOG\.md|README\.md|AGENTS\.md|CLAUDE\.md|LICENSE|docs\/|\.github\/|\.gitignore|dprint\.json|\.compound-engineering\/|tests\/release\/|tools\/data\/|tools\/[^/]+\.json|packages\/looma\/README\.md)/.test(file)) continue;
    throw new Error(`Unmapped qualification input: ${file}`);
  }
  for (const [file, source] of Object.entries(files)) {
    if (/^tools\/scripts\/.*\.test\.mjs$/.test(file) && (full || modules.includes(file) || components.some(tag => references(source, tag)))) scripts.add(file);
    if (!/^packages\/looma\/tests\/.*\.test\.ts$/.test(file)) continue;
    const cases = testCases(source);
    const changed = changes.includes(file) || modules.includes(file);
    const edited = changed ? editedCases(source, hunks[file]) : [];
    const configured = nativeConfig && vitestConfiguration(file) === "vitest.config.ts" || browserConfig && vitestConfiguration(file) === "vitest.browser.config.ts";
    const selected = cases.filter(entry => full || configured || edited.some(change => change.start === entry.start)
      || components.some(tag => references(entry.source, tag)) || editor && /editor|mention/i.test(file));
    if (selected.length) packageTests[file] = selected.map(({ name }) => name);
    else if ((changed || full || configured || components.some(tag => references(source, tag))) && !cases.length || modules.includes(file) && !selected.length) packageTests[file] = null;
  }
  if (changes.some(file => /^\.github\//.test(file))) for (const file of ["tools/scripts/ci-selection.test.mjs", "tools/scripts/release-qualification-policy.test.mjs", "tools/scripts/release-workflow-policy.test.mjs"]) if (files[file]) scripts.add(file);
  return { full, components, packageTests, scripts: [...scripts].sort(), editor, source: full || componentChanges.length > 0 || editor };
}

export function validateVitestReport(report, names) {
  const assertions = (report.testResults ?? []).flatMap((suite) => suite.assertionResults ?? []);
  const patterns = names?.map((name) => new RegExp(caseNamePattern([name])));
  const actual = assertions.filter((entry) => !patterns || patterns.some((pattern) => pattern.test(entry.fullName)));
  if (!actual.length || patterns?.some((pattern) => !actual.some((entry) => pattern.test(entry.fullName)))) throw new Error("Empty or incomplete selected Vitest discovery");
  if (actual.some((entry) => entry.status !== "passed") || report.success !== true) throw new Error("Every selected Vitest case must have passed");
  return actual.map(({ fullName }) => fullName).sort();
}
// These are Looma integration checks, not a second platform conformance suite.
export const smokeCases = {
  "packages/looma/tests/browser.test.ts": [
    "HTML components register and lower from dist/index.js",
    "Vue components render, style, and behave with no HTML Next runtime",
    "Vue components update a v-model prop once per choice, though the choice is two events",
    "Dialog close policy and presentation opens modally with modal, locks scroll, closes on Escape, returns focus, and reports trigger and close events",
    "Search Shell keyboard results moves among enabled rows and closes on Escape in HTML",
    "Search Shell keyboard results moves among enabled rows and closes on Escape in Vue",
    "Combobox chip truncation ellipsizes native chip labels inside their badge at desktop and 375px",
    "Combobox chip truncation ellipsizes Vue chip labels inside their badge at desktop and 375px",
  ],
  "packages/looma/tests/editor-table.test.ts": [
    "LoomaEditor tables inserts a table sized from the toolbar's insert-table grid",
    "LoomaEditor tables colors, merges, and splits a multi-cell selection",
    "atomic editor blocks selects a clicked divider for deletion and restores it with undo",
  ],
};

/** Keep edited regressions first, direct component behavior next, then composed consumers. */
export function automaticChecks(files, changes, hunks = {}) {
  const selection = selectChecks(files, changes, hunks);
  const nativeTests = {}, candidates = [], browserTests = {}, deferred = [];
  const direct = [...new Set(changes.map(componentOf).filter(Boolean))];
  for (const [file, names] of Object.entries(selection.packageTests)) {
    if (!isBrowserTest(file, files[file])) { nativeTests[file] = names; continue; }
    const cases = testCases(files[file]);
    const editedNames = new Set(changes.includes(file) ? editedCases(files[file], hunks[file]).map(entry => entry.name) : []);
    for (const entry of cases.filter(entry => !names || names.includes(entry.name))) {
      const edited = editedNames.has(entry.name);
      const smoke = smokeCases[file]?.includes(entry.name);
      const focused = selection.components.some(tag => references(entry.source, tag)) || selection.editor && /editor|mention/i.test(file);
      if (selection.full && !edited && !smoke && !focused) { deferred.push({ file, name: entry.name }); continue; }
      candidates.push({ file, name: entry.name, priority: edited ? 0 : smoke ? 1 : direct.some(tag => references(entry.source, tag)) ? 2 : 3,
        weight: entry.dynamic ? 3 : 1 });
    }
    if (!cases.length) throw new Error(`Unmapped browser discovery: ${file}`);
  }
  // 80 browser instances reserve room for install/build and slow hosted runners.
  // A changed assertion never loses priority to a neighbouring component's sweep.
  let instances = 0;
  for (const entry of candidates.sort((a, b) => a.priority - b.priority)) {
    if (instances + entry.weight > 80) { deferred.push({ file: entry.file, name: entry.name }); continue; }
    (browserTests[entry.file] ??= []).push(entry.name);
    instances += entry.weight;
  }
  const packageConsumer = selection.source || changes.some(releaseTool) || changes.some(file => file.startsWith("tests/release/"));
  // Only documentation changes build the docs in PRs. Package behavior is tested at its owner.
  const docsBuild = selection.full || changes.some(file => file.startsWith("apps/docs/") || file.includes("/examples/") || docsTool(file));
  return { ...selection, nativeTests, browserTests, deferred, packageConsumer, docsBuild, browserInstances: instances };
}
