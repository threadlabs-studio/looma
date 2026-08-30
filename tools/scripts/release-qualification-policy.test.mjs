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
    "pnpm --filter @looma/core test:browser && pnpm --filter @looma/editor test:browser && pnpm --filter @looma/vue test:browser && pnpm --filter @looma/docs test:browser"
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
    "apps/docs/tests/release-docs.spec.ts",
    "tests/release/consumer/src/index.ts",
  ];

  for (const relativePath of requiredSuites) {
    const source = await readFile(path.join(repoRoot, relativePath), "utf8");
    assert.doesNotMatch(source, /\b(?:describe|it|test)\.(?:skip|todo)\b/, relativePath);
  }
});

test("public Candidate documentation is install-first and fail-closed", async () => {
  const releasePackages = ["tokens", "layout", "core", "editor", "vue"];
  const [gettingStarted, supportPage, rootLicense] = await Promise.all([
    readFile(path.join(repoRoot, "apps/docs/docs/getting-started.md"), "utf8"),
    readFile(path.join(repoRoot, "apps/docs/docs/release-1-support.md"), "utf8"),
    readFile(path.join(repoRoot, "LICENSE"), "utf8").catch(() => null)
  ]);

  assert.match(gettingStarted, /npm install vue@\^3\.5 @looma\/vue/);
  assert.doesNotMatch(gettingStarted, /^pnpm install$/m);
  assert.match(gettingStarted, /React and Svelte.+not published or supported/);
  assert.match(supportPage, /Candidate `0\.1\.0`/);

  for (const packageName of releasePackages) {
    const scopedName = `@looma/${packageName}`;
    assert.match(gettingStarted + supportPage, new RegExp(scopedName.replace("/", "\\/")));

    const readme = await readFile(
      path.join(repoRoot, `packages/${packageName}/README.md`),
      "utf8"
    );
    assert.match(readme, /Candidate `0\.1\.0`/);
    assert.match(readme, /## Install/);
    assert.match(readme, /https:\/\/github\.com\/threadlabs-studio\/looma/);
    assert.match(readme, /https:\/\/github\.com\/threadlabs-studio\/looma\/issues/);
    if (rootLicense) {
      assert.match(readme, /https:\/\/github\.com\/threadlabs-studio\/looma\/blob\/main\/LICENSE/);
    } else {
      assert.match(readme, /license link is intentionally pending owner approval/);
    }
  }
});

test("the no-index Candidate docs preview is manual, protected, and SHA-pinned", async () => {
  const workflow = await readFile(
    path.join(repoRoot, ".github/workflows/docs-preview.yml"),
    "utf8"
  );
  const config = await readFile(path.join(repoRoot, "apps/docs/docusaurus.config.ts"), "utf8");

  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /pull_request:/);
  assert.doesNotMatch(workflow, /\n\s+push:/);
  assert.match(workflow, /name: docs-preview/);
  assert.match(config, /noindex,nofollow/);
  assert.match(config, /Release 1 Candidate preview/);

  const uses = [...workflow.matchAll(/uses:\s+([^\s#]+)/g)].map((match) => match[1]);
  assert.ok(uses.length > 0);
  for (const action of uses) {
    assert.match(action, /^[^@]+@[a-f0-9]{40}$/);
  }
});

test("the Knit artifact proof is isolated, fail-closed, and exercises the release consumer", async () => {
  const [rootPackage, script, registryConfig, npmrc] = await Promise.all([
    readFile(path.join(repoRoot, "package.json"), "utf8"),
    readFile(path.join(repoRoot, "tools/scripts/verify-knit-consumer.mjs"), "utf8"),
    readFile(path.join(repoRoot, "tests/release/registry/verdaccio.yaml"), "utf8"),
    readFile(path.join(repoRoot, "tests/release/registry/.npmrc"), "utf8")
  ]);
  const scripts = JSON.parse(rootPackage).scripts;

  assert.equal(scripts["release:verify-knit"], "node tools/scripts/verify-knit-consumer.mjs");
  assert.equal(
    scripts["release:inspect-knit"],
    "node tools/scripts/verify-knit-consumer.mjs --allow-ineligible-artifacts --skip-full-knit-unit"
  );
  assert.match(script, /worktree", "add", "--detach"/);
  assert.match(script, /manifest\.sourceCommit === loomaCommit/);
  assert.match(script, /--store-dir/);
  assert.match(script, /test:gate:unit/);
  assert.match(script, /skipFullKnitUnit/);
  assert.match(script, /fullKnitUnitSuitePassed/);
  assert.match(script, /getDefaultEditorExtensions/);
  assert.match(script, /renderToString/);
  assert.match(script, /pnpm", \["build"/);
  assert.match(script, /pnpm", \["typecheck"/);

  const loomaPolicy = registryConfig.match(/'@looma\/\*':[\s\S]*?\n\s*'\*\*':/)?.[0] ?? "";
  assert.match(loomaPolicy, /access: \$all/);
  assert.match(loomaPolicy, /publish: \$all/);
  assert.doesNotMatch(loomaPolicy, /proxy:/);
  assert.match(npmrc, /@looma:registry=\$\{LOOMA_REGISTRY_URL\}/);
  assert.match(script, /--config\.auto-install-peers=true/);
  assert.match(script, /--config\.prefer-workspace-packages=false/);
  assert.match(script, /--config\.link-workspace-packages=false/);
});
