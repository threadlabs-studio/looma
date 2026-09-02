import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("release qualification is wired to Node 20, Chromium, and non-placeholder gates", async () => {
  const [workflow, rootPackage, editorPackage, consumerPackage] = await Promise.all([
    readFile(path.join(repoRoot, ".github/workflows/ci.yml"), "utf8"),
    readFile(path.join(repoRoot, "package.json"), "utf8"),
    readFile(path.join(repoRoot, "packages/editor/package.json"), "utf8"),
    readFile(path.join(repoRoot, "tests/release/consumer/package.json"), "utf8"),
  ]);

  assert.match(workflow, /node-version: 20/);
  assert.match(workflow, /playwright install --with-deps chromium/);
  assert.match(workflow, /pnpm test:browser/);
  assert.match(workflow, /git diff --exit-code -- generated packages\/core\/src\/components/);
  assert.equal(
    JSON.parse(rootPackage).scripts["test:browser"],
    "pnpm --filter @threadlabs/looma-core test:browser && pnpm --filter @threadlabs/looma-editor test:browser && pnpm --filter @threadlabs/looma-vue test:browser && pnpm --filter @threadlabs/looma-docs test:browser"
  );
  assert.equal(JSON.parse(editorPackage).scripts.test, "vitest run");
  assert.doesNotMatch(
    JSON.parse(consumerPackage).scripts["verify:ssr"],
    /experimental-strip-types/,
    "the public consumer must execute on the Node 20 release runtime"
  );
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

test("public Candidate documentation is install-first, time-stable, and fail-closed", async () => {
  const [rootReadme, gettingStarted, supportPage, facadeReadme, releaseChecklist] = await Promise.all([
    readFile(path.join(repoRoot, "README.md"), "utf8"),
    readFile(path.join(repoRoot, "apps/docs/docs/getting-started.md"), "utf8"),
    readFile(path.join(repoRoot, "apps/docs/docs/release-1-support.md"), "utf8"),
    readFile(path.join(repoRoot, "packages/looma/README.md"), "utf8"),
    readFile(path.join(repoRoot, "docs/release-checklist.md"), "utf8")
  ]);

  assert.match(rootReadme, /confirm.+candidate.+dist-tag/is);
  assert.doesNotMatch(rootReadme, /not on npm yet|install after Candidate publication/i);
  assert.match(gettingStarted, /pnpm add @threadlabs\/looma/);
  assert.doesNotMatch(gettingStarted, /^pnpm install$/m);
  assert.match(gettingStarted, /Vue and Tiptap are optional to Looma as a whole/);
  assert.match(
    gettingStarted,
    /pnpm add @threadlabs\/looma vue@\^3\.5\.0 @tiptap\/vue-3@\^2\.11\.5/
  );
  assert.match(gettingStarted, /consuming application.not Looma.owns/);
  assert.match(gettingStarted, /@threadlabs\/looma\/editor/);
  assert.match(gettingStarted, /@threadlabs\/looma\/vue/);
  assert.match(supportPage, /Candidate `0\.1\.1`/);
  assert.match(facadeReadme, /pnpm add @threadlabs\/looma/);
  assert.match(releaseChecklist, /`@threadlabs\/looma` Candidate tarball/);
  assert.match(releaseChecklist, /superseded\s+`@threadlabs\/looma-\*` identity/);
  assert.match(releaseChecklist, /pgTAP RLS suite/);
  assert.match(releaseChecklist, /signup\/authoring\s+browser flow/);
  assert.match(releaseChecklist, /`releaseEligible: false`/);
  assert.match(releaseChecklist, /`finalReleaseGateRequired: false`/);
  assert.match(releaseChecklist, /protected `release:verify` dispatch becomes\s+eligible only/is);
  assert.doesNotMatch(releaseChecklist, /eligible singleton manifest/i);
  assert.doesNotMatch(
    rootReadme + gettingStarted + supportPage + releaseChecklist,
    /@threadlabs\/looma-(?:tokens|layout|core|editor|vue|react|svelte)/
  );
});

test("the packed facade consumer matrix pins every editor and Vue entry", async () => {
  const script = await readFile(
    path.join(repoRoot, "tools/scripts/verify-facade-consumer.mjs"),
    "utf8"
  );

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
  assert.match(workflow, /LOOMA_DOCS_RELEASE_MODE: preview/);
  assert.match(config, /LOOMA_DOCS_RELEASE_MODE must be preview or candidate/);
  assert.match(config, /isCandidateRelease \? "index,follow" : "noindex,nofollow"/);
  assert.match(config, /Release 1 Candidate documentation preview/);

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
  const packageJson = JSON.parse(rootPackage);
  const scripts = packageJson.scripts;

  assert.equal(packageJson.devDependencies.verdaccio, "6.8.0");
  assert.equal(scripts["release:verify-knit"], "node tools/scripts/verify-knit-consumer.mjs");
  assert.equal(
    scripts["release:inspect-knit"],
    "node tools/scripts/verify-knit-consumer.mjs --allow-ineligible-artifacts --skip-full-knit-unit"
  );
  assert.match(script, /worktree", "add", "--detach"/);
  assert.match(script, /temporaryDirectory = path\.join\(repoRoot, "\.release\/tmp"\)/);
  assert.match(script, /pgTAP files are visible to the database test container/);
  assert.match(script, /temporaryRoot\.startsWith\(`\$\{temporaryDirectory\}/);
  assert.match(script, /manifest\.sourceCommit === loomaCommit/);
  assert.match(script, /--store-dir/);
  assert.match(script, /test:gate:unit/);
  assert.match(script, /skipFullKnitUnit/);
  assert.match(script, /fullKnitUnitSuitePassed/);
  assert.match(script, /databaseMigrationsPassed/);
  assert.match(script, /databaseRlsPassed/);
  assert.match(script, /databaseTestFiles\.length > 0/);
  assert.match(script, /Files=\(\\d\+\), Tests=\(\\d\+\),/);
  assert.match(script, /pgTAP executed no assertions/);
  assert.match(script, /browserSignupFlowPassed/);
  assert.match(script, /test:e2e:local:required/);
  assert.match(script, /db:start/);
  assert.match(script, /db:test/);
  assert.match(script, /result: qualificationResult/);
  assert.match(
    script,
    /fullKnitUnitSuitePassed: qualificationResult === "passed" && !skipFullKnitUnit/
  );
  assert.match(
    script,
    /qualificationResult !== "passed" \|\| skipFullKnitUnit \|\| !Object\.values\(gateResults\)\.every\(Boolean\)/
  );
  assert.match(script, /failure: qualificationFailure/);
  assert.match(script, /await Promise\.all\(\[\s*rm\(evidencePath, \{ force: true \}\)/);
  assert.match(script, /try \{\s*assert\(\s*nodeMajor === RELEASE_NODE_MAJOR/);
  assert.match(
    script,
    /try \{[\s\S]*await writeFile\(evidencePath,[\s\S]*\} finally \{[\s\S]*worktree", "remove"/
  );
  assert.match(script, /function sanitizeRegistryLog/);
  assert.match(script, /getDefaultEditorExtensions/);
  assert.match(script, /renderToString/);
  assert.match(script, /RELEASE_NODE_MAJOR = 20/);
  assert.match(script, /process\.versions\.node/);
  assert.match(script, /NUXT_PUBLIC_GOOGLE_CLIENT_ID/);
  assert.match(script, /pnpm", \["build:release"/);
  assert.match(script, /pnpm", \["typecheck"/);

  const facadePolicy = registryConfig.match(/'@threadlabs\/looma':[\s\S]*?\n\s*'@threadlabs\/looma-\*':/)?.[0] ?? "";
  const rejectedOldIdentityPolicy = registryConfig.match(/'@threadlabs\/looma-\*':[\s\S]*?\n\s*'\*\*':/)?.[0] ?? "";
  const unrelatedPolicy = registryConfig.match(/'\*\*':[\s\S]*$/)?.[0] ?? "";
  assert.match(facadePolicy, /access: \$all/);
  assert.match(facadePolicy, /publish: \$all/);
  assert.doesNotMatch(facadePolicy, /proxy:/);
  assert.match(rejectedOldIdentityPolicy, /publish: nobody/);
  assert.doesNotMatch(rejectedOldIdentityPolicy, /proxy:/);
  assert.match(unrelatedPolicy, /proxy: npmjs/);
  assert.match(npmrc, /@threadlabs:registry=\$\{LOOMA_REGISTRY_URL\}/);
  assert.match(script, /--config\.auto-install-peers=true/);
  assert.match(script, /--config\.prefer-workspace-packages=false/);
  assert.match(script, /--config\.link-workspace-packages=false/);
  assert.match(script, /RELEASE_PACKAGE_NAME/);
  assert.match(script, /\$\{RELEASE_PACKAGE_NAME\}\/editor"/);
  assert.match(script, /\$\{RELEASE_PACKAGE_NAME\}\/editor\/ui"/);
  assert.match(script, /\$\{RELEASE_PACKAGE_NAME\}\/editor\/extensions"/);
  assert.match(script, /\$\{RELEASE_PACKAGE_NAME\}\/vue"/);
  assert.match(script, /\$\{RELEASE_PACKAGE_NAME\}\/vue\/editor"/);
  assert.doesNotMatch(script, /@threadlabs\/looma-(?:core|editor|layout|tokens|vue)/);
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
