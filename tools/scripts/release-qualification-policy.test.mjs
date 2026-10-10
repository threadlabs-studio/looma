import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("every workspace and release fixture reports the root release version", async () => {
  const manifestPaths = [
    "package.json",
    "apps/docs/package.json",
    "apps/storybook/package.json",
    "packages/looma/package.json",
    "tests/release/consumer/package.json",
    "tools/tsconfig/package.json",
  ];
  const manifests = await Promise.all(
    manifestPaths.map(async (manifestPath) => ({
      manifestPath,
      packageJson: JSON.parse(await readFile(path.join(repoRoot, manifestPath), "utf8")),
    }))
  );
  const rootVersion = manifests[0].packageJson.version;

  for (const { manifestPath, packageJson } of manifests) {
    assert.equal(packageJson.version, rootVersion, `${manifestPath} drifted from ${rootVersion}`);
  }
});

test("release qualification is wired to Node 24, Chromium, and non-placeholder gates", async () => {
  const [workflow, rootPackage, loomaPackage, consumerPackage] = await Promise.all([
    readFile(path.join(repoRoot, ".github/workflows/ci.yml"), "utf8"),
    readFile(path.join(repoRoot, "package.json"), "utf8"),
    readFile(path.join(repoRoot, "packages/looma/package.json"), "utf8"),
    readFile(path.join(repoRoot, "tests/release/consumer/package.json"), "utf8"),
  ]);

  assert.match(workflow, /node-version: 24/);
  assert.match(workflow, /mcr\.microsoft\.com\/playwright:v1\.60\.0-noble@sha256:/);
  assert.doesNotMatch(workflow, /playwright install|--project=firefox|--project=webkit/);
  assert.match(workflow, /ci-qualification\.mjs run quality/);
  const qualifier = await readFile(path.join(repoRoot, "tools/scripts/ci-qualification.mjs"), "utf8");
  assert.match(qualifier, /run\(vitestArguments\(/);
  const selector = await readFile(path.join(repoRoot, "tools/scripts/ci-selection.mjs"), "utf8");
  assert.match(selector, /"vitest", "run"/);
  assert.match(selector, /vitest\.browser\.config\.ts/);
  assert.match(
    JSON.parse(rootPackage).scripts["release:verify"],
    /pnpm test:facade-consumer/,
    "release verification must compile and execute the exact release consumer against packed bytes"
  );
  assert.equal(
    JSON.parse(rootPackage).scripts["test:browser"],
    "pnpm --filter @threadlabs/looma test:browser && pnpm --filter @threadlabs/looma-docs test:browser"
  );
  assert.equal(JSON.parse(loomaPackage).scripts.test, "vitest run");
  assert.doesNotMatch(
    JSON.parse(consumerPackage).scripts["verify:ssr"],
    /experimental-strip-types/,
    "the public consumer must execute on the Node 24 release runtime"
  );
});

test("the required verify result gates unit tests, browser regressions, and release packaging", async () => {
  const [workflow, rootPackage, loomaPackage] = await Promise.all([
    readFile(path.join(repoRoot, ".github/workflows/ci.yml"), "utf8"),
    readFile(path.join(repoRoot, "package.json"), "utf8"),
    readFile(path.join(repoRoot, "packages/looma/package.json"), "utf8"),
  ]);
  const qualityJob = workflow.match(
    /\n  quality:[\s\S]*?(?=\n  [a-zA-Z0-9_-]+:|$)/
  )?.[0] ?? "";
  const releasePackagingJob = workflow.match(
    /\n  release-package:[\s\S]*?(?=\n  [a-zA-Z0-9_-]+:|$)/
  )?.[0] ?? "";
  const verifyJob = workflow.match(
    /\n  verify:[\s\S]*?(?=\n  [a-zA-Z0-9_-]+:|$)/
  )?.[0] ?? "";

  assert.match(qualityJob, /ci-qualification\.mjs run quality/);
  const qualifier = await readFile(path.join(repoRoot, "tools/scripts/ci-qualification.mjs"), "utf8");
  assert.match(qualifier, /"@threadlabs\/looma", "build"/);
  assert.match(await readFile(path.join(repoRoot, "packages/looma/build.mjs"), "utf8"), /vue-tsc/);
  assert.equal(JSON.parse(loomaPackage).scripts.lint, JSON.parse(loomaPackage).scripts.typecheck);
  assert.equal(JSON.parse(rootPackage).scripts.lint, "pnpm -r run lint");
  assert.match(JSON.parse(loomaPackage).scripts.lint, /tsc .+ --noEmit/);
  assert.match(releasePackagingJob, /ci-qualification\.mjs run package-consumer/);
  assert.match(qualifier, /run\(\["release:verify"\]\)/);
  assert.match(verifyJob, /if: always\(\)/);
  assert.match(verifyJob, /needs: \[quality, browser, release-package\]/);
  assert.match(verifyJob, /QUALITY_RESULT: \$\{\{ needs\.quality\.result \}\}/);
  assert.match(
    verifyJob,
    /RELEASE_PACKAGE_RESULT: \$\{\{ needs\.release-package\.result \}\}/
  );
  assert.match(verifyJob, /test "\$QUALITY_RESULT" = "success"/);
  assert.match(verifyJob, /test "\$RELEASE_PACKAGE_RESULT" = "success"/);
});

test("required release suites contain no skipped or todo scenarios", async () => {
  const requiredSuites = [
    "packages/looma/tests/browser.test.ts",
    "packages/looma/tests/editor-extensions.test.ts",
    "packages/looma/tests/looma-editor-history.browser.test.ts",
    "packages/looma/tests/looma-editor-mention.browser.test.ts",
    "packages/looma/tests/mention-typing.browser.test.ts",
    "apps/docs/tests/release-docs.spec.ts",
    "tests/release/consumer/src/index.ts",
  ];

  for (const relativePath of requiredSuites) {
    const source = await readFile(path.join(repoRoot, relativePath), "utf8");
    assert.doesNotMatch(source, /\b(?:describe|it|test)\.(?:skip|todo)\b/, relativePath);
  }
});

test("every Vitest browser test is included by its package browser config", async () => {
  const browserPackages = ["packages/looma"];

  for (const packagePath of browserPackages) {
    const config = await readFile(path.join(repoRoot, packagePath, "vitest.browser.config.ts"), "utf8");
    const sourceRoot = path.join(repoRoot, packagePath);
    const entries = await readdir(sourceRoot, { recursive: true });
    const browserTests = entries
      .filter((entry) =>
        !entry.includes("node_modules/")
        && !entry.includes("__screenshots__/")
        && /\.browser\.(?:test|spec)\.ts$/.test(entry)
      )
      .sort();

    for (const browserTest of browserTests) {
      assert.match(
        config,
        new RegExp(browserTest.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
        `${browserTest} exists but is excluded from ${packagePath}/vitest.browser.config.ts`,
      );
    }
  }
});

test("public documentation is install-first and installs from latest", async () => {
  const [rootReadme, gettingStarted, supportPage, facadeReadme] = await Promise.all([
    readFile(path.join(repoRoot, "README.md"), "utf8"),
    readFile(path.join(repoRoot, "apps/docs/docs/getting-started.md"), "utf8"),
    readFile(path.join(repoRoot, "apps/docs/docs/release-1-support.md"), "utf8"),
    readFile(path.join(repoRoot, "packages/looma/README.md"), "utf8")
  ]);

  assert.match(rootReadme, /^pnpm add @threadlabs\/looma$/m);
  assert.doesNotMatch(rootReadme + gettingStarted + supportPage, /@candidate|candidate.+dist-tag/is);
  assert.doesNotMatch(rootReadme, /not on npm yet|install after Candidate publication/i);
  assert.match(gettingStarted, /pnpm add @threadlabs\/looma/);
  assert.doesNotMatch(gettingStarted, /^pnpm install$/m);
  assert.match(gettingStarted, /Vue and Tiptap are optional to Looma as a whole/);
  assert.match(
    gettingStarted,
    /pnpm add @threadlabs\/looma vue@\^3\.5\.0 @tiptap\/vue-3@\^2\.11\.5/
  );
  assert.match(gettingStarted, /Hosts own persistence/);
  assert.match(gettingStarted, /@threadlabs\/looma\/editor/);
  assert.match(gettingStarted, /@threadlabs\/looma\/vue/);
  assert.match(supportPage, /publishes to npm as \*\*`@threadlabs\/looma`\*\*/);
  assert.doesNotMatch(supportPage + gettingStarted, /Candidate/);
  assert.match(facadeReadme, /pnpm add @threadlabs\/looma/);
  assert.doesNotMatch(
    rootReadme + gettingStarted + supportPage,
    /@threadlabs\/looma-(?:tokens|layout|core|editor|vue|react|svelte)/
  );
});

test("the packed facade consumer matrix pins every editor and Vue entry", async () => {
  const [script, consumerPackage] = await Promise.all([
    readFile(path.join(repoRoot, "tools/scripts/verify-facade-consumer.mjs"), "utf8"),
    readFile(path.join(repoRoot, "tests/release/consumer/package.json"), "utf8").then(JSON.parse)
  ]);

  for (const subpath of ["editor", "editor/ui", "editor/extensions", "vue", "vue/editor"]) {
    const exactImport = new RegExp(
      `["']@threadlabs/looma/${subpath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
      "g"
    );
    assert.ok(
      [...script.matchAll(exactImport)].length >= 2,
      `${subpath} must be covered by runtime and typecheck consumers`
    );
  }

  assert.match(
    consumerPackage.dependencies["@tiptap/vue-3"],
    /^\^2\./,
    "the Vue editor consumer must install its declared Tiptap Vue peer"
  );
});

test("the public consumer command is a separate fail-closed registry gate", async () => {
  const [rootPackage, script] = await Promise.all([
    readFile(path.join(repoRoot, "package.json"), "utf8"),
    readFile(path.join(repoRoot, "tools/scripts/verify-public-consumer.mjs"), "utf8")
  ]);
  const scripts = JSON.parse(rootPackage).scripts;

  assert.equal(
    scripts["release:verify-public-consumer"],
    "node tools/scripts/verify-public-consumer.mjs"
  );
  assert.match(script, /https:\/\/registry\.npmjs\.org\//);
  assert.match(script, /--prefer-offline=false/);
  assert.match(script, /--config\.prefer-workspace-packages=false/);
  assert.match(script, /--config\.link-workspace-packages=false/);
  assert.match(script, /NPM_CONFIG_USERCONFIG/);
  assert.match(script, /NODE_AUTH_TOKEN/);
  assert.match(script, /finally/);
});


test("automatic checks and publication fit a 15-minute parallel critical path", async () => {
  const ci = await readFile(path.join(repoRoot, ".github/workflows/ci.yml"), "utf8");
  const release = await readFile(path.join(repoRoot, ".github/workflows/release.yml"), "utf8");
  const docs = await readFile(path.join(repoRoot, ".github/workflows/docs.yml"), "utf8");
  const parity = await readFile(path.join(repoRoot, ".github/workflows/docs-parity.yml"), "utf8");
  const minutes = source => [...source.matchAll(/timeout-minutes: (\d+)/g)].map(match => Number(match[1]));
  const ciLimits = minutes(ci);
  const gate = ciLimits.at(-1);
  const qualification = Math.max(...ciLimits.slice(0, -1)) + gate;
  assert.ok(qualification + minutes(release).reduce((a, b) => a + b, 0) <= 15);
  assert.ok(qualification + Math.max(...minutes(docs)) <= 15);
  assert.ok(Math.max(...minutes(parity)) <= 15);
  assert.doesNotMatch(ci, /needs: plan|actions: read|qualification.*artifact|format:check|check:code-documentation/);
  assert.doesNotMatch(parity, /playwright.*test|docs-visual|container:/);
  const extended = await readFile(path.join(repoRoot, ".github/workflows/extended.yml"), "utf8");
  assert.match(extended, /workflow_dispatch:/);
  assert.doesNotMatch(extended, /pull_request:|push:|schedule:|workflow_run:/);
  assert.match(extended, /--project=firefox/);
  assert.match(extended, /--project=webkit/);
  const packaging = await readFile(path.join(repoRoot, "tools/scripts/verify-packages.mjs"), "utf8");
  assert.match(packaging, /\["--filter", "@threadlabs\/looma", "build"\]/);
  assert.doesNotMatch(packaging, /\["build"\]/);
});
