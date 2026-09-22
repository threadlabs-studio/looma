import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const toolRepositoryRoot = path.resolve(scriptDirectory, "../..");
const FACET_TAGS = Object.freeze(["contract", "failure", "invariant", "lifecycle", "ownership"]);
const ISSUE_ORDER = Object.freeze([
  "missing-summary",
  "tautological-summary",
  "missing-facet",
  "unresolved-link",
]);
const SUMMARY_STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "be", "by", "create", "creates", "for", "from",
  "get", "gets", "is", "of", "or", "return", "returns", "set", "sets", "that", "the",
  "this", "to", "with",
]);
const RESOURCE_METHODS = new Set([
  "abort", "cancel", "close", "destroy", "disconnect", "dispose", "hide", "remove", "stop",
]);

// The hand-written TypeScript entries. The component entries (".", "./vue") are generated from the
// component templates, which document themselves.
export const PUBLIC_ENTRYPOINTS = Object.freeze([
  { packageName: "@threadlabs/looma", exportPath: "./editor", packageDirectory: "packages/looma", source: "packages/looma/src/editor/index.ts" },
  { packageName: "@threadlabs/looma", exportPath: "./editor/ui", packageDirectory: "packages/looma", source: "packages/looma/src/editor/ui.ts" },
  { packageName: "@threadlabs/looma", exportPath: "./editor/extensions", packageDirectory: "packages/looma", source: "packages/looma/src/editor/extensions/index.ts" },
  { packageName: "@threadlabs/looma", exportPath: "./vue/editor", packageDirectory: "packages/looma", source: "packages/looma/src/vue/editor/index.ts" },
]);

function loadTypeScript() {
  const require = createRequire(path.join(toolRepositoryRoot, "packages/looma/package.json"));
  return require("typescript");
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function sortedObject(entries) {
  return Object.fromEntries([...entries].sort(([left], [right]) => left.localeCompare(right)));
}

function isGeneratedOrPrivateSource(relativePath) {
  return relativePath.endsWith(".d.ts")
    || relativePath.includes("/node_modules/")
    || relativePath.includes("/dist/")
    || relativePath.includes("/src/generated/")
    || relativePath.endsWith("/src/generated-component-types.ts")
    || relativePath.includes("/src/declarative/")
    || /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(relativePath);
}

function symbolDeclarations(symbol, repositoryRoot, packageRoot) {
  return (symbol.declarations ?? [])
    .filter((declaration) => {
      const fileName = path.resolve(declaration.getSourceFile().fileName);
      const relativePath = toPosix(path.relative(repositoryRoot, fileName));
      const packageRelativePath = path.relative(packageRoot, fileName);
      return !relativePath.startsWith("../")
        && !path.isAbsolute(relativePath)
        && !packageRelativePath.startsWith("..")
        && !path.isAbsolute(packageRelativePath)
        && /\.[cm]?tsx?$/.test(relativePath)
        && !isGeneratedOrPrivateSource(relativePath);
    })
    .sort((left, right) => {
      const fileOrder = left.getSourceFile().fileName.localeCompare(right.getSourceFile().fileName);
      return fileOrder || left.getStart() - right.getStart();
    });
}

function normalizeWords(value) {
  return value
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .match(/[a-z\d]+/g)
    ?.filter((word) => !SUMMARY_STOP_WORDS.has(word)) ?? [];
}

function parameterNames(declarations) {
  const names = [];
  for (const declaration of declarations) {
    for (const parameter of declaration.parameters ?? []) {
      names.push(...normalizeWords(parameter.name.getText()));
    }
  }
  return names;
}

function isTautologicalSummary(summary, symbolName, declarations) {
  const summaryWords = normalizeWords(summary);
  if (summaryWords.length === 0) return true;
  const allowed = new Set([
    ...normalizeWords(symbolName),
    ...parameterNames(declarations),
    "api", "function", "interface", "method", "option", "options", "type", "value",
  ]);
  return summaryWords.length <= 8 && summaryWords.every((word) => allowed.has(word));
}

function containsFunctionType(ts, node) {
  let found = false;
  const visit = (child) => {
    if (found) return;
    if (ts.isFunctionTypeNode(child) || ts.isCallSignatureDeclaration(child)) {
      found = true;
      return;
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
}

function functionLikeReasons(ts, checker, declaration) {
  const reasons = new Set();
  if (declaration.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword)) {
    reasons.add("asynchronous");
  }
  for (const parameter of declaration.parameters ?? []) {
    const type = checker.getTypeAtLocation(parameter);
    const directlyCallable = type.getCallSignatures().length > 0;
    if (directlyCallable || (parameter.type && containsFunctionType(ts, parameter.type))) {
      reasons.add("callback-bearing");
    }
    if (checker.typeToString(type).includes("AbortSignal")) reasons.add("cancellable");
    if (directlyCallable || !(type.flags & ts.TypeFlags.Object)) continue;
    for (const property of checker.getPropertiesOfType(type)) {
      const propertyDeclaration = property.valueDeclaration ?? property.declarations?.[0];
      if (!propertyDeclaration) continue;
      const propertyType = checker.getTypeOfSymbolAtLocation(property, propertyDeclaration);
      if (propertyType.getCallSignatures().length > 0) reasons.add("callback-bearing");
      if (property.getName() === "signal" && checker.typeToString(propertyType).includes("AbortSignal")) {
        reasons.add("cancellable");
      }
    }
  }
  if (declaration.type && /^Promise(?:<|$)/.test(checker.typeToString(checker.getTypeFromTypeNode(declaration.type)))) {
    reasons.add("asynchronous");
  }
  const signature = checker.getSignatureFromDeclaration(declaration);
  if (signature) {
    const returnType = checker.getReturnTypeOfSignature(signature);
    const returnName = checker.typeToString(returnType);
    if (/^Promise(?:<|$)/.test(returnName)) reasons.add("asynchronous");
    const properties = checker.getPropertiesOfType(returnType).map((property) => property.getName());
    if (properties.some((name) => RESOURCE_METHODS.has(name))) reasons.add("resource-owning");
  }
  return reasons;
}

function facetReasons(ts, checker, symbol, declarations) {
  const reasons = new Set();
  for (const declaration of declarations) {
    if (
      ts.isFunctionDeclaration(declaration)
      || ts.isMethodDeclaration(declaration)
      || ts.isMethodSignature(declaration)
      || ts.isCallSignatureDeclaration(declaration)
    ) {
      for (const reason of functionLikeReasons(ts, checker, declaration)) reasons.add(reason);
    }
    if (ts.isClassDeclaration(declaration)) reasons.add("stateful");
    if (ts.isInterfaceDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration)) {
      if (containsFunctionType(ts, declaration)) reasons.add("callback-bearing");
      for (const member of declaration.members ?? []) {
        const name = member.name?.getText().replace(/["']/g, "");
        if (name && RESOURCE_METHODS.has(name)) reasons.add("resource-owning");
        if (ts.isMethodSignature(member)) {
          for (const reason of functionLikeReasons(ts, checker, member)) reasons.add(reason);
        }
      }
    }
    if (ts.isVariableDeclaration(declaration)) {
      if (declaration.initializer && (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))) {
        reasons.add("callback-bearing");
      }
      const initializerText = declaration.initializer?.getText() ?? "";
      if (/\.(?:configure|create|extend)\s*\(/.test(initializerText)) reasons.add("stateful");
    }
  }
  if (/^(?:attach|bind|create|initialize|manage|observe|open|register)/.test(symbol.getName())) {
    reasons.add("lifecycle-sensitive");
  }
  return [...reasons].sort();
}

function leadingDocumentationText(ts, declaration) {
  const sourceFile = declaration.getSourceFile();
  const ranges = ts.getLeadingCommentRanges(sourceFile.text, declaration.getFullStart()) ?? [];
  return ranges
    .filter((range) => sourceFile.text.startsWith("/**", range.pos))
    .map((range) => sourceFile.text.slice(range.pos, range.end))
    .join("\n");
}

function unresolvedLinks(ts, checker, declarations, publicNames) {
  const unresolved = new Set();
  for (const declaration of declarations) {
    const text = leadingDocumentationText(ts, declaration);
    for (const match of text.matchAll(/\{@link(?:code|plain)?\s+([^\s}|]+)/g)) {
      const target = match[1];
      if (!target || /^(?:https?:|#)/.test(target)) continue;
      const rootName = target.split(/[.#]/)[0];
      if (publicNames.has(rootName)) continue;
      const meaning = ts.SymbolFlags.Type | ts.SymbolFlags.Value | ts.SymbolFlags.Namespace | ts.SymbolFlags.Alias;
      const resolved = typeof checker.resolveName === "function"
        ? checker.resolveName(rootName, declaration, meaning, false)
        : checker.getSymbolsInScope(declaration, meaning).find((symbol) => symbol.getName() === rootName);
      if (!resolved) unresolved.add(target);
    }
  }
  return [...unresolved].sort();
}

async function compilerOptions(ts, repositoryRoot) {
  const configPath = path.join(repositoryRoot, "tsconfig.base.json");
  try {
    const source = await readFile(configPath, "utf8");
    const parsed = ts.parseConfigFileTextToJson(configPath, source);
    if (parsed.error) throw new Error(ts.flattenDiagnosticMessageText(parsed.error.messageText, "\n"));
    return ts.parseJsonConfigFileContent(parsed.config, ts.sys, repositoryRoot).options;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      skipLibCheck: true,
    };
  }
}

async function entrypointMetadata(repositoryRoot, entrypoints) {
  const packageCache = new Map();
  const configurationErrors = [];
  for (const entrypoint of entrypoints) {
    const packagePath = path.join(repositoryRoot, entrypoint.packageDirectory, "package.json");
    let metadata = packageCache.get(packagePath);
    if (!metadata) {
      try {
        metadata = JSON.parse(await readFile(packagePath, "utf8"));
        packageCache.set(packagePath, metadata);
      } catch (error) {
        configurationErrors.push(`${entrypoint.packageName}: cannot read ${toPosix(path.relative(repositoryRoot, packagePath))}: ${error.message}`);
        continue;
      }
    }
    if (metadata.name !== entrypoint.packageName) {
      configurationErrors.push(`${entrypoint.packageName}: package.json declares ${metadata.name ?? "no name"}`);
    }
    if (!Object.hasOwn(metadata.exports ?? {}, entrypoint.exportPath)) {
      configurationErrors.push(`${entrypoint.packageName}${entrypoint.exportPath === "." ? "" : entrypoint.exportPath.slice(1)}: missing package export`);
    }
  }
  return { packageCache, configurationErrors };
}

/**
 * Resolves package entry-point exports and evaluates their handwritten symbols.
 *
 * @contract Generated declarations, tests, build tools, and private source exports are excluded.
 * @ownership The caller supplies the repository snapshot; this function performs no writes.
 */
export async function analyzePublicDocumentation({
  repositoryRoot,
  entrypoints = PUBLIC_ENTRYPOINTS,
}) {
  const ts = loadTypeScript();
  const absoluteRoot = path.resolve(repositoryRoot);
  const { packageCache, configurationErrors } = await entrypointMetadata(absoluteRoot, entrypoints);
  const rootNames = [...new Set(entrypoints.map(({ source }) => path.join(absoluteRoot, source)))];
  const program = ts.createProgram({ rootNames, options: await compilerOptions(ts, absoluteRoot) });
  const checker = program.getTypeChecker();
  const packages = new Map();

  for (const entrypoint of [...entrypoints].sort((left, right) =>
    left.packageName.localeCompare(right.packageName) || left.exportPath.localeCompare(right.exportPath))) {
    const sourcePath = path.resolve(absoluteRoot, entrypoint.source);
    const sourceFile = program.getSourceFile(sourcePath);
    if (!sourceFile) {
      configurationErrors.push(`${entrypoint.packageName}:${entrypoint.exportPath}: TypeScript did not load ${entrypoint.source}`);
      continue;
    }
    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
    if (!moduleSymbol) {
      configurationErrors.push(`${entrypoint.packageName}:${entrypoint.exportPath}: ${entrypoint.source} is not a module`);
      continue;
    }
    const packagePath = path.join(absoluteRoot, entrypoint.packageDirectory, "package.json");
    const packageRoot = path.join(absoluteRoot, entrypoint.packageDirectory);
    const metadata = packageCache.get(packagePath) ?? {};
    const packageRecord = packages.get(entrypoint.packageName) ?? {
      version: metadata.version ?? "unknown",
      entrypoints: new Set(),
      symbols: new Map(),
      publicNames: new Set(),
    };
    packageRecord.entrypoints.add(entrypoint.exportPath);
    packages.set(entrypoint.packageName, packageRecord);
    const exportedSymbols = checker.getExportsOfModule(moduleSymbol);
    for (const exportedSymbol of exportedSymbols) {
      packageRecord.publicNames.add(exportedSymbol.getName());
    }
    // Generated framework projections are validated by API parity checks. They
    // stay in the package inventory but are not treated as handwritten prose.
    if (entrypoint.generatedProjection) continue;

    for (const exportedSymbol of exportedSymbols) {
      let symbol = exportedSymbol;
      if (symbol.flags & ts.SymbolFlags.Alias) {
        try {
          symbol = checker.getAliasedSymbol(symbol);
        } catch {
          continue;
        }
      }
      const declarations = symbolDeclarations(symbol, absoluteRoot, packageRoot);
      if (declarations.length === 0) continue;
      const declaration = declarations[0];
      const relativeSource = toPosix(path.relative(absoluteRoot, declaration.getSourceFile().fileName));
      const key = `${relativeSource}#${symbol.getName()}`;
      const existing = packageRecord.symbols.get(key) ?? {
        symbol,
        declarations,
        exports: new Set(),
      };
      existing.exports.add(`${entrypoint.exportPath}:${exportedSymbol.getName()}`);
      packageRecord.symbols.set(key, existing);

      // Re-exports can reveal additional names that an inline link may target.
      packageRecord.publicNames.add(symbol.getName());
    }
  }

  const outputPackages = [];
  let symbolCount = 0;
  let issueCount = 0;
  for (const [packageName, packageRecord] of [...packages].sort(([left], [right]) => left.localeCompare(right))) {
    const symbolEntries = [];
    for (const [key, record] of [...packageRecord.symbols].sort(([left], [right]) => left.localeCompare(right))) {
      const summary = ts.displayPartsToString(record.symbol.getDocumentationComment(checker)).trim().replace(/\s+/g, " ");
      const facets = [...new Set(record.symbol.getJsDocTags(checker)
        .map(({ name }) => name)
        .filter((name) => FACET_TAGS.includes(name)))].sort();
      const reasons = facetReasons(ts, checker, record.symbol, record.declarations);
      const links = unresolvedLinks(ts, checker, record.declarations, packageRecord.publicNames);
      const issues = [];
      if (summary === "") issues.push("missing-summary");
      else if (isTautologicalSummary(summary, record.symbol.getName(), record.declarations)) issues.push("tautological-summary");
      if (reasons.length > 0 && facets.length === 0) issues.push("missing-facet");
      if (links.length > 0) issues.push("unresolved-link");
      issues.sort((left, right) => ISSUE_ORDER.indexOf(left) - ISSUE_ORDER.indexOf(right));
      const firstDeclaration = record.declarations[0];
      const position = firstDeclaration.getSourceFile().getLineAndCharacterOfPosition(firstDeclaration.getStart());
      symbolEntries.push([key, {
        name: record.symbol.getName(),
        source: key.slice(0, key.lastIndexOf("#")),
        line: position.line + 1,
        exports: [...record.exports].sort(),
        summary,
        facets,
        facetReasons: reasons,
        unresolvedLinks: links,
        issues,
      }]);
      symbolCount += 1;
      issueCount += issues.length;
    }
    outputPackages.push([packageName, {
      version: packageRecord.version,
      entrypoints: [...packageRecord.entrypoints].sort(),
      symbols: sortedObject(symbolEntries),
    }]);
  }

  return {
    schemaVersion: 1,
    packages: sortedObject(outputPackages),
    totals: {
      packages: outputPackages.length,
      symbols: symbolCount,
      issues: issueCount,
    },
    configurationErrors: [...new Set(configurationErrors)].sort(),
  };
}

function compareVersions(left, right) {
  const parse = (value) => value.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const leftParts = parse(left);
  const rightParts = parse(right);
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const delta = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (delta !== 0) return Math.sign(delta);
  }
  return 0;
}

function flattenedSymbols(report) {
  const symbols = new Map();
  for (const [packageName, packageRecord] of Object.entries(report.packages)) {
    for (const [symbol, record] of Object.entries(packageRecord.symbols)) {
      symbols.set(`${packageName}:${symbol}`, { packageName, ...record });
    }
  }
  return symbols;
}

/**
 * Validates narrow policy exceptions separately from baseline debt.
 *
 * @invariant Every exception names an observed issue and exactly one expiry mechanism.
 * @failure Expired, stale, vague, or unknown exceptions are configuration errors.
 */
export function validateExceptions(report, manifest, now = new Date()) {
  const errors = [];
  const covered = new Map();
  const symbols = flattenedSymbols(report);
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.exceptions)) {
    return { covered, errors: ["Exception manifest must use schemaVersion 1 and an exceptions array."] };
  }
  const seen = new Set();
  for (const exception of [...manifest.exceptions].sort((left, right) =>
    String(left.symbol).localeCompare(String(right.symbol)))) {
    const symbol = symbols.get(exception.symbol);
    if (!symbol) {
      errors.push(`${exception.symbol}: exception names an unknown public symbol`);
      continue;
    }
    if (seen.has(exception.symbol)) errors.push(`${exception.symbol}: duplicate exception`);
    seen.add(exception.symbol);
    if (typeof exception.reason !== "string" || exception.reason.trim().length < 20) {
      errors.push(`${exception.symbol}: exception reason must contain at least 20 characters`);
    }
    const hasDate = typeof exception.expiresOn === "string";
    const hasVersion = typeof exception.expiresAtVersion === "string";
    if (hasDate === hasVersion) {
      errors.push(`${exception.symbol}: exception needs exactly one of expiresOn or expiresAtVersion`);
    } else if (hasDate) {
      const expires = new Date(`${exception.expiresOn}T23:59:59.999Z`);
      if (Number.isNaN(expires.getTime())) errors.push(`${exception.symbol}: invalid expiresOn date`);
      else if (now.getTime() > expires.getTime()) errors.push(`${exception.symbol}: exception expired on ${exception.expiresOn}`);
    } else if (compareVersions(report.packages[exception.symbol.split(":", 1)[0]]?.version ?? "0.0.0", exception.expiresAtVersion) >= 0) {
      errors.push(`${exception.symbol}: exception expired at package version ${exception.expiresAtVersion}`);
    }
    if (!Array.isArray(exception.issues) || exception.issues.length === 0) {
      errors.push(`${exception.symbol}: exception must name at least one issue`);
      continue;
    }
    const issueSet = new Set();
    for (const issue of exception.issues) {
      if (!symbol.issues.includes(issue)) errors.push(`${exception.symbol}: exception for stale or unknown issue ${issue}`);
      else issueSet.add(issue);
    }
    covered.set(exception.symbol, issueSet);
  }
  return { covered, errors: errors.sort() };
}

/**
 * Classifies current gaps as accepted baseline debt or enforcement regressions.
 *
 * @contract Adding a gap to a new or formerly clean symbol fails. Resolved gaps
 * must be removed from the baseline so their allowance cannot hide a relapse.
 */
export function compareWithBaseline(report, baseline, coveredExceptions = new Map()) {
  if (baseline?.schemaVersion !== 1 || typeof baseline.symbols !== "object" || baseline.symbols === null) {
    throw new TypeError("Documentation baseline must use schemaVersion 1 and a symbols object.");
  }
  const baselineGaps = [];
  const regressions = [];
  const excepted = [];
  const currentSymbols = flattenedSymbols(report);
  for (const [symbol, record] of currentSymbols) {
    const knownIssues = new Set(baseline.symbols[symbol] ?? []);
    const exceptions = coveredExceptions.get(symbol) ?? new Set();
    for (const issue of record.issues) {
      const key = `${symbol}:${issue}`;
      if (exceptions.has(issue)) excepted.push(key);
      else if (knownIssues.has(issue)) baselineGaps.push(key);
      else regressions.push(key);
    }
  }
  const staleBaseline = [];
  for (const [symbol, issues] of Object.entries(baseline.symbols)) {
    const currentIssues = new Set(currentSymbols.get(symbol)?.issues ?? []);
    for (const issue of issues) {
      if (!currentIssues.has(issue)) staleBaseline.push(`${symbol}:${issue}`);
    }
  }
  return {
    baselineGaps: baselineGaps.sort(),
    regressions: regressions.sort(),
    excepted: excepted.sort(),
    staleBaseline: staleBaseline.sort(),
  };
}

export function createBaseline(report) {
  const entries = [];
  for (const [symbol, record] of flattenedSymbols(report)) {
    // A clean symbol needs no baseline row: if it later gains an issue, the
    // absence of an allowance is exactly what turns that issue into a regression.
    if (record.issues.length > 0) entries.push([symbol, [...record.issues].sort()]);
  }
  return { schemaVersion: 1, symbols: sortedObject(entries) };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const knownArgs = new Set(["--check", "--report", "--snapshot"]);
  const unknown = [...args].filter((argument) => !knownArgs.has(argument));
  if (unknown.length > 0 || [...args].filter((argument) => knownArgs.has(argument)).length > 1) {
    throw new TypeError("Usage: node tools/scripts/check-code-documentation.mjs [--report|--check|--snapshot]");
  }
  const mode = args.has("--check") ? "check" : args.has("--snapshot") ? "snapshot" : "report";
  const report = await analyzePublicDocumentation({ repositoryRoot: toolRepositoryRoot });
  if (mode === "snapshot") {
    process.stdout.write(`${JSON.stringify(createBaseline(report), null, 2)}\n`);
    if (report.configurationErrors.length > 0) process.exitCode = 1;
    return;
  }
  const dataDirectory = path.join(toolRepositoryRoot, "tools/data");
  const baseline = await readJson(path.join(dataDirectory, "code-documentation-baseline.json"));
  const exceptions = validateExceptions(
    report,
    await readJson(path.join(dataDirectory, "code-documentation-exceptions.json")),
  );
  const comparison = compareWithBaseline(report, baseline, exceptions.covered);
  const output = {
    ...report,
    enforcement: {
      mode,
      regressions: comparison.regressions,
      baselineGaps: comparison.baselineGaps,
      staleBaseline: comparison.staleBaseline,
      excepted: comparison.excepted,
      exceptionErrors: exceptions.errors,
    },
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  if (
    report.configurationErrors.length > 0
    || exceptions.errors.length > 0
    || (mode === "check" && (comparison.regressions.length > 0 || comparison.staleBaseline.length > 0))
  ) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
