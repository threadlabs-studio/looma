import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("release qualification is wired to Node 20, Chromium, and non-placeholder gates", async () => {
  const [workflow, rootPackage, editorPackage] = await Promise.all([
    readFile(path.join(repoRoot, ".github/workflows/ci.yml"), "utf8"),
    readFile(path.join(repoRoot, "package.json"), "utf8"),
    readFile(path.join(repoRoot, "packages/editor/package.json"), "utf8"),
  ]);

  assert.match(workflow, /node-version: 20/);
  assert.match(workflow, /playwright install --with-deps chromium/);
  assert.match(workflow, /pnpm test:browser/);
  assert.match(workflow, /git diff --exit-code -- generated packages\/core\/src\/components/);
  assert.equal(
    JSON.parse(rootPackage).scripts["test:browser"],
    "pnpm --filter @looma/core test:browser && pnpm --filter @looma/editor test:browser && pnpm --filter @looma/vue test:browser"
  );
  assert.equal(JSON.parse(editorPackage).scripts.test, "vitest run");
});

test("required release suites contain no skipped or todo scenarios", async () => {
  const requiredSuites = [
    "packages/core/src/components/ui-context-menu/ui-context-menu.browser.test.ts",
    "packages/core/test/ssr-contract.spec.ts",
    "packages/editor/test/editor-release-contract.spec.ts",
    "packages/editor/test/editor-release-contract.browser.spec.ts",
    "packages/vue/src/registration.browser.test.ts",
    "tests/release/consumer/src/index.ts",
  ];

  for (const relativePath of requiredSuites) {
    const source = await readFile(path.join(repoRoot, relativePath), "utf8");
    assert.doesNotMatch(source, /\b(?:describe|it|test)\.(?:skip|todo)\b/, relativePath);
  }
});
