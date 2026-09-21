import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  analyzePublicDocumentation,
  compareWithBaseline,
  createBaseline,
  validateExceptions,
} from "./check-code-documentation.mjs";

async function createFixture(files) {
  const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), "looma-code-docs-"));
  await writeFile(path.join(repositoryRoot, "tsconfig.base.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "Bundler",
      strict: true,
      skipLibCheck: true,
      types: [],
    },
  }), "utf8");
  for (const [relativePath, source] of Object.entries(files)) {
    const target = path.join(repositoryRoot, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, source, "utf8");
  }
  return repositoryRoot;
}

const entrypoint = {
  packageName: "@fixture/public",
  exportPath: ".",
  packageDirectory: "packages/public",
  source: "packages/public/src/index.ts",
};

test("walks re-exports while excluding generated declarations", async () => {
  const repositoryRoot = await createFixture({
    "packages/public/package.json": JSON.stringify({
      name: "@fixture/public",
      version: "1.0.0",
      exports: { ".": "./dist/index.js" },
    }),
    "packages/public/src/index.ts": [
      'export { documented, CallbackApi } from "./public.js";',
      'export { generatedValue } from "./generated/value.js";',
      'export { dependencyValue } from "../../dependency/src/index.js";',
      "",
    ].join("\n"),
    "packages/public/src/public.ts": [
      "/**",
      " * Converts an external identifier without changing its stable identity.",
      " * @contract Empty identifiers remain empty.",
      " */",
      "export function documented(identifier: string): string { return identifier; }",
      "/**",
      " * Supplies work that runs only while the owning request remains active.",
      " * @ownership The caller owns the callback and its captured resources.",
      " */",
      "export interface CallbackApi { run(callback: () => void): void; }",
      "",
    ].join("\n"),
    "packages/public/src/generated/value.ts": "export const generatedValue = 1;\n",
    "packages/dependency/src/index.ts": "export const dependencyValue = 1;\n",
  });

  const report = await analyzePublicDocumentation({
    repositoryRoot,
    entrypoints: [entrypoint],
  });

  const symbols = report.packages["@fixture/public"].symbols;
  assert.deepEqual(Object.keys(symbols), [
    "packages/public/src/public.ts#CallbackApi",
    "packages/public/src/public.ts#documented",
  ]);
  assert.deepEqual(symbols["packages/public/src/public.ts#CallbackApi"].issues, []);
  assert.deepEqual(symbols["packages/public/src/public.ts#documented"].facets, ["contract"]);

  const generatedProjection = await analyzePublicDocumentation({
    repositoryRoot,
    entrypoints: [{ ...entrypoint, generatedProjection: true }],
  });
  assert.deepEqual(generatedProjection.packages["@fixture/public"].symbols, {});
});

test("reports missing, tautological, facet, and unresolved-link failures", async () => {
  const repositoryRoot = await createFixture({
    "packages/public/package.json": JSON.stringify({
      name: "@fixture/public",
      version: "1.0.0",
      exports: { ".": "./dist/index.js" },
    }),
    "packages/public/src/index.ts": [
      "export function undocumented(value: string): string { return value; }",
      "/** Returns format value. */",
      "export function formatValue(value: string): string { return value; }",
      "/** Runs supplied work after parsing. */",
      "export function runWork(callback: () => void): void { callback(); }",
      "/** Resolves a known value through {@link MissingContract}. */",
      "export function linked(value: string): string { return value; }",
      "",
    ].join("\n"),
  });

  const report = await analyzePublicDocumentation({
    repositoryRoot,
    entrypoints: [entrypoint],
  });
  const symbols = report.packages["@fixture/public"].symbols;

  assert.deepEqual(symbols["packages/public/src/index.ts#undocumented"].issues, ["missing-summary"]);
  assert.deepEqual(symbols["packages/public/src/index.ts#formatValue"].issues, ["tautological-summary"]);
  assert.deepEqual(symbols["packages/public/src/index.ts#runWork"].issues, ["missing-facet"]);
  assert.deepEqual(symbols["packages/public/src/index.ts#linked"].issues, ["unresolved-link"]);
});

test("the baseline ratchets old gaps but rejects new or regressed gaps", () => {
  const symbols = {
    "src/api.ts#clean": { issues: ["missing-summary"] },
    "src/api.ts#improved": { issues: [] },
    "src/api.ts#newGap": { issues: ["missing-facet"] },
  };
  const baseline = {
    schemaVersion: 1,
    symbols: {
      "@fixture/public:src/api.ts#clean": ["missing-summary"],
      "@fixture/public:src/api.ts#improved": ["missing-summary"],
    },
  };

  const comparison = compareWithBaseline({
    packages: { "@fixture/public": { symbols } },
  }, baseline, new Map());

  assert.deepEqual(comparison.regressions, [
    "@fixture/public:src/api.ts#newGap:missing-facet",
  ]);
  assert.deepEqual(comparison.baselineGaps, [
    "@fixture/public:src/api.ts#clean:missing-summary",
  ]);
  assert.deepEqual(comparison.staleBaseline, [
    "@fixture/public:src/api.ts#improved:missing-summary",
  ]);
  assert.deepEqual(createBaseline({
    packages: { "@fixture/public": { symbols } },
  }), {
    schemaVersion: 1,
    symbols: {
      "@fixture/public:src/api.ts#clean": ["missing-summary"],
      "@fixture/public:src/api.ts#newGap": ["missing-facet"],
    },
  });
});

test("exceptions must be current, specific, reasoned, and expiring", () => {
  const report = {
    packages: {
      "@fixture/public": {
        version: "1.2.0",
        symbols: {
          "src/api.ts#Mode": { issues: ["missing-summary"] },
        },
      },
    },
  };
  const key = "@fixture/public:src/api.ts#Mode";

  const active = validateExceptions(report, {
    schemaVersion: 1,
    exceptions: [{
      symbol: key,
      issues: ["missing-summary"],
      reason: "Literal union is self-evident at this boundary.",
      expiresOn: "2027-01-01",
    }],
  }, new Date("2026-09-20T00:00:00Z"));
  assert.equal(active.errors.length, 0);
  assert.deepEqual(active.covered.get(key), new Set(["missing-summary"]));

  const expired = validateExceptions(report, {
    schemaVersion: 1,
    exceptions: [{
      symbol: key,
      issues: ["missing-summary"],
      reason: "Literal union is self-evident at this boundary.",
      expiresAtVersion: "1.2.0",
    }],
  }, new Date("2026-09-20T00:00:00Z"));
  assert.match(expired.errors[0], /expired at package version 1\.2\.0/);
});
