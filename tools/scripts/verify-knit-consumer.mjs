import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { RELEASE_PACKAGE_NAMES, RELEASE_VERSION } from "./release-config.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");
const artifactDirectory = path.join(repoRoot, ".release/artifacts");
const evidenceDirectory = path.join(repoRoot, ".release/evidence");
const manifestPath = path.join(artifactDirectory, "release-manifest.json");
const registryConfigPath = path.join(repoRoot, "tests/release/registry/verdaccio.yaml");
const npmrcPath = path.join(repoRoot, "tests/release/registry/.npmrc");
const defaultKnitDirectory = path.resolve(repoRoot, "../knit");
const RELEASE_NODE_MAJOR = 20;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function hasArgument(name) {
  return process.argv.includes(name);
}

function sanitizeRegistryLog(chunks, token) {
  const output = chunks.join("");
  return token ? output.replaceAll(token, "[redacted]") : output;
}

function run(command, args, options = {}) {
  process.stdout.write(`\n$ ${command} ${args.join(" ")}\n`);
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: options.env ?? process.env,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit"
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed (${result.status})\n${result.stdout ?? ""}${result.stderr ?? ""}`
    );
  }
  return (result.stdout ?? "").trim();
}

async function sha256(filePath) {
  const bytes = await readFile(filePath);
  return createHash("sha256").update(bytes).digest("hex");
}

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address === "object", "could not allocate a loopback registry port");
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  return address.port;
}

async function waitForRegistry(registryUrl, registryProcess) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (registryProcess.exitCode !== null) {
      throw new Error(`Verdaccio exited before becoming ready (${registryProcess.exitCode})`);
    }
    try {
      const response = await fetch(`${registryUrl}-/ping`);
      if (response.ok) {
        return;
      }
    } catch {
      // The loopback listener may not be bound yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Verdaccio did not become ready within 30 seconds");
}

async function createFixtureRegistryToken(registryUrl) {
  const username = "looma-release-fixture";
  const response = await fetch(new URL(`-/user/org.couchdb.user:${username}`, registryUrl), {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      _id: `org.couchdb.user:${username}`,
      name: username,
      password: "local-disposable-registry-only",
      email: "release-fixture@example.invalid",
      type: "user",
      roles: [],
      date: new Date().toISOString()
    })
  });
  const responseBody = await response.text();
  assert(response.ok, `could not create disposable Verdaccio user (${response.status}): ${responseBody}`);
  const token = JSON.parse(responseBody).token;
  assert(typeof token === "string" && token.length > 0, "Verdaccio did not return a fixture token");
  return token;
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) {
    return;
  }
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000))
  ]);
  if (child.exitCode === null) {
    child.kill("SIGKILL");
  }
}

async function validateManifest(allowIneligibleArtifacts) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert(manifest.releaseVersion === RELEASE_VERSION, "release manifest version is not 0.1.0");
  assert(
    allowIneligibleArtifacts || manifest.releaseEligible === true,
    `release manifest is not eligible: ${(manifest.exceptions ?? []).join("; ")}`
  );
  assert(manifest.packages?.length === RELEASE_PACKAGE_NAMES.size, "release manifest package count differs from R1");

  const names = new Set(manifest.packages.map((entry) => entry.name));
  for (const packageName of RELEASE_PACKAGE_NAMES) {
    assert(names.has(packageName), `release manifest is missing ${packageName}`);
  }
  for (const entry of manifest.packages) {
    assert(entry.version === RELEASE_VERSION, `${entry.name} is not ${RELEASE_VERSION}`);
    const tarballPath = path.join(artifactDirectory, entry.tarball);
    assert((await sha256(tarballPath)) === entry.sha256, `${entry.name} tarball hash differs from manifest`);
  }
  return manifest;
}

async function rewriteKnitToRegistry(worktreeDirectory) {
  const packagePath = path.join(worktreeDirectory, "web/package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  for (const packageName of ["@threadlabs/looma-core", "@threadlabs/looma-editor", "@threadlabs/looma-vue"]) {
    assert(packageName in packageJson.dependencies, `Knit does not declare ${packageName}`);
    packageJson.dependencies[packageName] = RELEASE_VERSION;
  }
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
}

async function writeKnitSsrProof(worktreeDirectory) {
  const proofPath = path.join(worktreeDirectory, "web/.looma-release-artifact-proof.mjs");
  const source = `
import assert from "node:assert/strict";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import "@threadlabs/looma-editor";
import { getDefaultEditorExtensions } from "@threadlabs/looma-editor/extensions";
import {
  EditorTableOverlay,
  EditorToolbar,
  FloatingActionButton,
  Menu,
  MenuItem,
  SearchShell,
  ToastRegion,
  TopBar
} from "@threadlabs/looma-vue";

const extensions = getDefaultEditorExtensions();
assert.ok(Array.isArray(extensions) && extensions.length > 0, "editor extension preset is empty");

const cases = [
  [TopBar, "ui-top-bar"],
  [SearchShell, "ui-search-shell"],
  [Menu, "ui-menu"],
  [MenuItem, "ui-menu-item"],
  [ToastRegion, "ui-toast-region"],
  [FloatingActionButton, "ui-floating-action-button"],
  [EditorToolbar, "ui-editor-toolbar"],
  [EditorTableOverlay, "ui-editor-table-overlay"]
];

const warnings = [];
for (const [component, tagName] of cases) {
  const app = createSSRApp({ render: () => h(component, null, { default: () => "proof" }) });
  app.config.warnHandler = (message) => warnings.push(message);
  const html = await renderToString(app);
  assert.match(html, new RegExp("<" + tagName + "(?:\\\\s|>)"), tagName + " did not SSR");
}
assert.deepEqual(warnings, [], "Vue emitted SSR warnings: " + warnings.join(" | "));
process.stdout.write("Rendered " + cases.length + " Knit-consumed Looma surfaces from packed artifacts.\\n");
`;
  await writeFile(proofPath, source.trimStart(), "utf8");
  return proofPath;
}

async function validateInstalledGraph(worktreeDirectory) {
  const lockPath = path.join(worktreeDirectory, "pnpm-lock.yaml");
  const lockfile = await readFile(lockPath, "utf8");
  const canonicalWorktreeDirectory = await realpath(worktreeDirectory);
  const canonicalRepoRoot = await realpath(repoRoot);
  assert(!/(?:link|workspace|file):[^\n]*looma/i.test(lockfile), "Knit lockfile retained a local Looma reference");
  for (const packageName of RELEASE_PACKAGE_NAMES) {
    const escapedName = packageName.replace("/", "\\/");
    assert(new RegExp(`['\"]?${escapedName}@${RELEASE_VERSION}`).test(lockfile), `${packageName}@${RELEASE_VERSION} is absent from Knit lockfile`);
  }

  const resolutions = {};
  for (const packageName of ["@threadlabs/looma-core", "@threadlabs/looma-editor", "@threadlabs/looma-vue"]) {
    const packageDirectory = await realpath(path.join(worktreeDirectory, "web/node_modules", packageName));
    assert(
      packageDirectory.startsWith(canonicalWorktreeDirectory + path.sep),
      `${packageName} resolved outside the isolated Knit worktree: ${packageDirectory}`
    );
    assert(!packageDirectory.startsWith(canonicalRepoRoot + path.sep), `${packageName} resolved to Looma source`);
    const packageJson = JSON.parse(await readFile(path.join(packageDirectory, "package.json"), "utf8"));
    assert(packageJson.version === RELEASE_VERSION, `${packageName} installed ${packageJson.version}`);
    resolutions[packageName] = packageDirectory;
  }

  return { lockPath, lockfile, resolutions };
}

async function main() {
  const evidencePath = path.join(evidenceDirectory, "knit-consumer.json");
  const copiedLockPath = path.join(evidenceDirectory, "knit-pnpm-lock.yaml");
  const registryLogPath = path.join(evidenceDirectory, "verdaccio.log");
  await mkdir(evidenceDirectory, { recursive: true });
  await Promise.all([
    rm(evidencePath, { force: true }),
    rm(copiedLockPath, { force: true }),
    rm(registryLogPath, { force: true })
  ]);

  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "", 10);
  const allowIneligibleArtifacts = hasArgument("--allow-ineligible-artifacts");
  const skipFullKnitUnit = hasArgument("--skip-full-knit-unit");
  const registryLog = [];
  let manifest;
  let loomaCommit = null;
  let knitCommit = null;
  let knitLiveStatus = "";
  let knitDirectory;
  let temporaryRoot;
  let knitWorktree;
  let registryStorage;
  let pnpmStore;
  let registryToken = "";
  let worktreeAttached = false;
  let registryProcess;
  let detachedKnitSourceClean = false;
  let installed;
  let qualificationError;
  let qualificationResult = "failed";
  let qualificationFailure = null;
  const commands = [];
  const gateResults = {
    installPassed: false,
    installedGraphPassed: false,
    buildPassed: false,
    typecheckPassed: false,
    ssrProofPassed: false,
    signupCriticalTestsPassed: false,
    fullKnitUnitSuitePassed: false
  };

  function runGate(gate, command, args, options) {
    commands.push([command, args]);
    const output = run(command, args, options);
    gateResults[gate] = true;
    return output;
  }

  try {
    assert(
      nodeMajor === RELEASE_NODE_MAJOR,
      `Knit release qualification requires Node ${RELEASE_NODE_MAJOR}.x; current runtime is ${process.version}`
    );
    assert(
      !skipFullKnitUnit || allowIneligibleArtifacts,
      "--skip-full-knit-unit is permitted only for an explicitly ineligible inspection rehearsal"
    );
    knitDirectory = path.resolve(process.env.LOOMA_KNIT_DIR ?? defaultKnitDirectory);
    assert(knitDirectory !== repoRoot, "Knit directory cannot be the Looma repository");

    manifest = await validateManifest(allowIneligibleArtifacts);
    loomaCommit = run("git", ["rev-parse", "HEAD"], { capture: true });
    assert(manifest.sourceCommit === loomaCommit, "release manifest does not describe the current Looma commit");
    knitCommit = run("git", ["-C", knitDirectory, "rev-parse", "HEAD"], { capture: true });
    knitLiveStatus = run("git", ["-C", knitDirectory, "status", "--porcelain"], { capture: true });

    temporaryRoot = await mkdtemp(path.join(tmpdir(), "looma-knit-release-"));
    knitWorktree = path.join(temporaryRoot, "knit");
    registryStorage = path.join(temporaryRoot, "registry-storage");
    pnpmStore = path.join(temporaryRoot, "pnpm-store");

    run("git", ["-C", knitDirectory, "worktree", "add", "--detach", knitWorktree, knitCommit]);
    worktreeAttached = true;
    assert(
      run("git", ["-C", knitWorktree, "status", "--porcelain"], { capture: true }) === "",
      "detached Knit source worktree was not clean"
    );
    detachedKnitSourceClean = true;

    const registryPort = await availablePort();
    const registryUrl = `http://127.0.0.1:${registryPort}/`;
    const runtimeRegistryConfigPath = path.join(temporaryRoot, "verdaccio.yaml");
    await writeFile(runtimeRegistryConfigPath, await readFile(registryConfigPath, "utf8"), "utf8");
    const registryEnvironment = {
      ...process.env,
      LOOMA_REGISTRY_URL: registryUrl,
      VERDACCIO_STORAGE_PATH: registryStorage
    };

    registryProcess = spawn(
      "pnpm",
      ["exec", "verdaccio", "--config", runtimeRegistryConfigPath, "--listen", `127.0.0.1:${registryPort}`],
      { cwd: repoRoot, env: registryEnvironment, stdio: ["ignore", "pipe", "pipe"] }
    );
    for (const stream of [registryProcess.stdout, registryProcess.stderr]) {
      stream.setEncoding("utf8");
      stream.on("data", (chunk) => registryLog.push(chunk));
    }
    await waitForRegistry(registryUrl, registryProcess);
    registryToken = await createFixtureRegistryToken(registryUrl);
    const clientNpmrcPath = path.join(temporaryRoot, ".npmrc");
    const npmrcTemplate = await readFile(npmrcPath, "utf8");
    await writeFile(
      clientNpmrcPath,
      `${npmrcTemplate}//${new URL(registryUrl).host}/:_authToken=${registryToken}\n`,
      "utf8"
    );
    registryEnvironment.NPM_CONFIG_USERCONFIG = clientNpmrcPath;

    for (const entry of [...manifest.packages].sort((left, right) => left.publishIndex - right.publishIndex)) {
      run(
        "npm",
        [
          "publish",
          path.join(artifactDirectory, entry.tarball),
          "--registry",
          registryUrl,
          "--tag",
          "candidate",
          "--access",
          "public",
          "--provenance=false",
          "--ignore-scripts",
          "--loglevel=error"
        ],
        { env: registryEnvironment }
      );
    }

    await rewriteKnitToRegistry(knitWorktree);
    const ssrProofPath = await writeKnitSsrProof(knitWorktree);
    const fixtureEnvironment = {
      ...registryEnvironment,
      CI: "1",
      NUXT_PUBLIC_SUPABASE_URL: "https://knit-release.supabase.co",
      NUXT_PUBLIC_SUPABASE_KEY: "release-fixture-public-key",
      NUXT_PUBLIC_GOOGLE_CLIENT_ID: "123456789-release_fixture.apps.googleusercontent.com",
      NUXT_SUPABASE_SECRET_KEY: "release-fixture-secret-key",
      NUXT_AUTH_HANDOFF_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
      NUXT_PUBLIC_SITE_URL: "https://knit.release.invalid"
    };
    const installCommand = [
      "pnpm",
      [
        "install",
        "--no-frozen-lockfile",
        "--prefer-offline=false",
        "--config.strict-peer-dependencies=false",
        "--config.auto-install-peers=true",
        "--config.prefer-workspace-packages=false",
        "--config.link-workspace-packages=false",
        "--config.verify-store-integrity=true",
        "--store-dir",
        pnpmStore
      ]
    ];
    const signupCriticalTests = [
      "tests/unit/middleware/auth.test.ts",
      "tests/unit/middleware/workspace.test.ts",
      "tests/unit/server/workspaces-create.test.ts",
      "tests/unit/composables/use-workspace.test.ts",
      "tests/unit/pages/login-callback-index.flow.test.ts",
      "tests/unit/pages/public-launch-surface.test.ts",
      "tests/unit/components/page-editor-save.test.ts",
      "tests/unit/components/collection-group.render.test.ts",
      "tests/unit/layouts/auth-layout.render.test.ts"
    ];
    runGate("installPassed", ...installCommand, { cwd: knitWorktree, env: fixtureEnvironment });
    installed = await validateInstalledGraph(knitWorktree);
    gateResults.installedGraphPassed = true;
    runGate("buildPassed", "pnpm", ["build:release"], {
      cwd: knitWorktree,
      env: fixtureEnvironment
    });
    runGate("typecheckPassed", "pnpm", ["typecheck"], {
      cwd: knitWorktree,
      env: fixtureEnvironment
    });
    runGate("ssrProofPassed", "node", [path.relative(path.join(knitWorktree, "web"), ssrProofPath)], {
      cwd: path.join(knitWorktree, "web"),
      env: fixtureEnvironment
    });
    runGate("signupCriticalTestsPassed", "pnpm", [
      "-F",
      "web",
      "exec",
      "vitest",
      "run",
      ...signupCriticalTests
    ], {
      cwd: knitWorktree,
      env: fixtureEnvironment
    });
    if (!skipFullKnitUnit) {
      const fullUnitCommand = ["pnpm", ["-F", "web", "test:gate:unit", "--", "--run"]];
      runGate("fullKnitUnitSuitePassed", ...fullUnitCommand, {
        cwd: knitWorktree,
        env: fixtureEnvironment
      });
    }
    qualificationResult = "passed";
  } catch (error) {
    qualificationError = error;
    const message = error instanceof Error ? error.message : String(error);
    qualificationFailure = sanitizeRegistryLog([message.split("\n")[0]], registryToken);
  }

  try {
    await stopProcess(registryProcess);
    registryProcess = undefined;
    if (installed) {
      await writeFile(copiedLockPath, installed.lockfile, "utf8");
    }
    const sanitizedRegistryLog = sanitizeRegistryLog(registryLog, registryToken);
    await writeFile(registryLogPath, sanitizedRegistryLog, "utf8");
    const evidence = {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      result: qualificationResult,
      failure: qualificationFailure,
      releaseEligibleArtifacts: manifest?.releaseEligible ?? false,
      releaseExceptions: manifest?.exceptions ?? [],
      loomaCommit,
      knitCommit,
      nodeVersion: process.versions.node,
      detachedKnitSourceClean,
      liveKnitWorktreeDirtyFiles: knitLiveStatus ? knitLiveStatus.split("\n").length : 0,
      qualificationMode: skipFullKnitUnit ? "inspection-rehearsal" : "release-gate",
      fullKnitUnitSuitePassed: qualificationResult === "passed" && !skipFullKnitUnit,
      finalReleaseGateRequired: qualificationResult !== "passed" || skipFullKnitUnit,
      gateResults,
      registryPolicy: {
        config: path.relative(repoRoot, registryConfigPath),
        loomaScopePublicFallback: false,
        otherDependenciesProxy: "https://registry.npmjs.org/"
      },
      acceptedConsumerException: "Knit declares @vitejs/plugin-vue 5 beside Vite 7; Looma validation runs with strict peer failure disabled and proves Looma peers through build, typecheck, SSR, and test execution.",
      packages: (manifest?.packages ?? []).map(({ name, version, tarball, sha256: hash }) => ({
        name,
        version,
        tarball,
        sha256: hash
      })),
      commands: commands.map(([command, args]) => `${command} ${args.join(" ")}`),
      evidence: {
        knitLockfile: installed ? path.relative(repoRoot, copiedLockPath) : null,
        knitLockfileSha256: installed ? await sha256(copiedLockPath) : null,
        registryLog: path.relative(repoRoot, registryLogPath),
        registryLogSha256: await sha256(registryLogPath)
      }
    };
    await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  } finally {
    if (worktreeAttached) {
      run("git", ["-C", knitDirectory, "worktree", "remove", "--force", knitWorktree]);
    }
    if (temporaryRoot) {
      assert(
        temporaryRoot.startsWith(`${tmpdir()}${path.sep}looma-knit-release-`),
        "refusing to remove an unexpected temporary directory"
      );
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }

  if (qualificationError) {
    process.stderr.write(`Qualification evidence: ${path.relative(repoRoot, evidencePath)}\n`);
    throw qualificationError;
  }
  process.stdout.write(`\nKnit consumed all five Looma ${RELEASE_VERSION} artifacts from the isolated registry.\n`);
  if (skipFullKnitUnit) {
    process.stdout.write("Inspection rehearsal only: the final release gate still requires an eligible manifest and the complete Knit unit suite.\n");
  }
  process.stdout.write(`Evidence: ${path.relative(repoRoot, evidencePath)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
