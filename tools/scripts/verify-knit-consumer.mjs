import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertExactReleasePackageSet,
  RELEASE_PACKAGE_NAMES,
  RELEASE_VERSION
} from "./release-config.mjs";
import { spawnManaged, stopProcess } from "./managed-process.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");
const artifactDirectory = path.join(repoRoot, ".release/artifacts");
const evidenceDirectory = path.join(repoRoot, ".release/evidence");
const temporaryDirectory = path.join(repoRoot, ".release/tmp");
const manifestPath = path.join(artifactDirectory, "release-manifest.json");
const registryConfigPath = path.join(repoRoot, "tests/release/registry/verdaccio.yaml");
const npmrcPath = path.join(repoRoot, "tests/release/registry/.npmrc");
const defaultKnitDirectory = path.resolve(repoRoot, "../knit");
const RELEASE_NODE_MAJOR = 20;
const [RELEASE_PACKAGE_NAME, ...additionalReleasePackageNames] = RELEASE_PACKAGE_NAMES;

if (!RELEASE_PACKAGE_NAME || additionalReleasePackageNames.length > 0) {
  throw new Error("Knit qualification requires exactly one public Looma package");
}

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

async function waitForHttp(url, child, logChunks) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Knit dev server exited before becoming ready (${child.exitCode})`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The loopback listener may not be bound yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Knit dev server did not become ready within 60 seconds\n${logChunks.join("").slice(-4_000)}`);
}

function commandSucceeds(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: options.env ?? process.env,
    stdio: "ignore"
  }).status === 0;
}

async function resolveDockerEnvironment() {
  if (commandSucceeds("docker", ["info"])) return { ...process.env };

  const colimaSocket = path.join(homedir(), ".colima/default/docker.sock");
  try {
    await access(colimaSocket);
  } catch {
    throw new Error("Docker is unavailable and the default Colima socket does not exist");
  }

  const environment = { ...process.env, DOCKER_HOST: `unix://${colimaSocket}` };
  assert(
    commandSucceeds("docker", ["info"], { env: environment }),
    "Colima is installed but its Docker socket is not ready"
  );
  process.stdout.write(`Using Colima Docker socket ${colimaSocket} for detached database gates.\n`);
  return environment;
}

function replaceTomlValue(source, section, key, value) {
  const escapedSection = section.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = new RegExp(`(\\[${escapedSection}\\][\\s\\S]*?^${key}\\s*=\\s*)[^\\n]+`, "m");
  assert(expression.test(source), `Supabase config is missing [${section}] ${key}`);
  return source.replace(expression, `$1${value}`);
}

async function configureIsolatedSupabase(worktreeDirectory, browserUrl) {
  const configPath = path.join(worktreeDirectory, "supabase/config.toml");
  const [apiPort, dbPort, shadowPort, studioPort, smtpPort, analyticsPort] = await Promise.all(
    Array.from({ length: 6 }, () => availablePort())
  );
  let config = await readFile(configPath, "utf8");
  config = config.replace(/^project_id\s*=\s*.+$/m, `project_id = "looma-knit-release-${process.pid}"`);
  config = replaceTomlValue(config, "api", "port", apiPort);
  config = replaceTomlValue(config, "db", "port", dbPort);
  config = replaceTomlValue(config, "db", "shadow_port", shadowPort);
  config = replaceTomlValue(config, "studio", "port", studioPort);
  config = replaceTomlValue(config, "local_smtp", "port", smtpPort);
  config = replaceTomlValue(config, "analytics", "port", analyticsPort);
  config = replaceTomlValue(config, "auth", "site_url", JSON.stringify(browserUrl));
  config = replaceTomlValue(config, "auth", "additional_redirect_urls", JSON.stringify([browserUrl]));
  await writeFile(configPath, config, "utf8");
}

function parseEnvironmentOutput(output) {
  const values = {};
  for (const line of output.split("\n")) {
    const match = /^([A-Z0-9_]+)="(.*)"$/.exec(line.trim());
    if (match) values[match[1]] = match[2];
  }
  return values;
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

async function validateManifest(allowIneligibleArtifacts) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert(
    manifest.releaseVersion === RELEASE_VERSION,
    `release manifest version is not ${RELEASE_VERSION}`
  );
  assert(
    allowIneligibleArtifacts || manifest.releaseEligible === true,
    `release manifest is not eligible: ${(manifest.exceptions ?? []).join("; ")}`
  );
  assertExactReleasePackageSet(manifest.packages ?? []);
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
  const packageName = RELEASE_PACKAGE_NAME;
  assert(packageName in packageJson.dependencies, `Knit does not declare ${packageName}`);
  assert(
    !Object.keys(packageJson.dependencies).some((name) => /^@threadlabs\/looma-/.test(name)),
    "Knit still declares a superseded Looma package identity"
  );
  packageJson.dependencies[packageName] = RELEASE_VERSION;
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
}

async function writeKnitSsrProof(worktreeDirectory) {
  const proofPath = path.join(worktreeDirectory, "web/.looma-release-artifact-proof.mjs");
  const source = `
import assert from "node:assert/strict";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { getDefaultEditorExtensions as getEditorExtensions } from "${RELEASE_PACKAGE_NAME}/editor";
import "${RELEASE_PACKAGE_NAME}/editor/ui";
import { getDefaultEditorExtensions as getExtensionPreset } from "${RELEASE_PACKAGE_NAME}/editor/extensions";
import {
  FloatingActionButton,
  Menu,
  MenuItem,
  SearchShell,
  ToastRegion,
  TopBar
} from "${RELEASE_PACKAGE_NAME}/vue";
import {
  EditorTableOverlay,
  EditorToolbar,
  getDefaultEditorExtensions as getVueEditorExtensions
} from "${RELEASE_PACKAGE_NAME}/vue/editor";

for (const [entrypoint, getExtensions] of [
  ["editor", getEditorExtensions],
  ["editor/extensions", getExtensionPreset],
  ["vue/editor", getVueEditorExtensions]
]) {
  const extensions = getExtensions();
  assert.ok(
    Array.isArray(extensions) && extensions.length > 0,
    entrypoint + " extension preset is empty"
  );
}

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
  assert(!/(?:link|workspace|file):[^\n]*looma/i.test(lockfile), "Knit lockfile retained a local Looma reference");
  for (const packageName of RELEASE_PACKAGE_NAMES) {
    const escapedName = packageName.replace("/", "\\/");
    assert(new RegExp(`['\"]?${escapedName}@${RELEASE_VERSION}`).test(lockfile), `${packageName}@${RELEASE_VERSION} is absent from Knit lockfile`);
  }

  const resolutions = {};
  for (const packageName of RELEASE_PACKAGE_NAMES) {
    const packageDirectory = await realpath(path.join(worktreeDirectory, "web/node_modules", packageName));
    assert(
      packageDirectory.startsWith(canonicalWorktreeDirectory + path.sep),
      `${packageName} resolved outside the isolated Knit worktree: ${packageDirectory}`
    );
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
  let knitDevProcess;
  let supabaseStarted = false;
  let dockerEnvironment;
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
    fullKnitUnitSuitePassed: false,
    databaseMigrationsPassed: false,
    databaseRlsPassed: false,
    browserSignupFlowPassed: false
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

    // Colima shares /Users with its VM, but not macOS's private temporary
    // directories. Keep the detached consumer under this ignored release area
    // so pgTAP files are visible to the database test container.
    await mkdir(temporaryDirectory, { recursive: true });
    temporaryRoot = await mkdtemp(path.join(temporaryDirectory, "knit-consumer-"));
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

    registryProcess = spawnManaged(
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

      const resolvedDockerEnvironment = await resolveDockerEnvironment();
      dockerEnvironment = {
        ...fixtureEnvironment,
        ...(resolvedDockerEnvironment.DOCKER_HOST
          ? { DOCKER_HOST: resolvedDockerEnvironment.DOCKER_HOST }
          : {})
      };
      const browserPort = await availablePort();
      const browserUrl = `http://localhost:${browserPort}`;
      await configureIsolatedSupabase(knitWorktree, browserUrl);
      runGate("databaseMigrationsPassed", "pnpm", ["db:start"], {
        cwd: knitWorktree,
        env: dockerEnvironment
      });
      supabaseStarted = true;
      const databaseTestFiles = (await readdir(path.join(knitWorktree, "supabase/tests"), {
        withFileTypes: true
      }))
        .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
        .map((entry) => entry.name)
        .toSorted();
      assert(databaseTestFiles.length > 0, "detached Knit checkout contains no pgTAP SQL files");
      commands.push(["pnpm", ["db:test"]]);
      const databaseTestOutput = run("pnpm", ["db:test"], {
        cwd: knitWorktree,
        env: dockerEnvironment,
        capture: true
      });
      process.stdout.write(`${databaseTestOutput}\n`);
      const databaseTestSummary = /Files=(\d+), Tests=(\d+),/.exec(databaseTestOutput);
      assert(databaseTestSummary, "pgTAP output did not include its file and assertion summary");
      assert(
        Number(databaseTestSummary[1]) === databaseTestFiles.length,
        `pgTAP executed ${databaseTestSummary[1]} of ${databaseTestFiles.length} discovered SQL files`
      );
      assert(Number(databaseTestSummary[2]) > 0, "pgTAP executed no assertions");
      gateResults.databaseRlsPassed = true;

      const supabaseStatus = parseEnvironmentOutput(
        run("pnpm", ["exec", "supabase", "status", "-o", "env"], {
          cwd: knitWorktree,
          env: dockerEnvironment,
          capture: true
        })
      );
      assert(supabaseStatus.API_URL, "Supabase status did not report API_URL");
      assert(supabaseStatus.ANON_KEY, "Supabase status did not report ANON_KEY");
      assert(supabaseStatus.SERVICE_ROLE_KEY, "Supabase status did not report SERVICE_ROLE_KEY");
      const browserEnvironment = {
        ...dockerEnvironment,
        E2E_BASE_URL: browserUrl,
        NUXT_PUBLIC_SITE_URL: browserUrl,
        NUXT_PUBLIC_SUPABASE_URL: supabaseStatus.API_URL,
        NUXT_PUBLIC_SUPABASE_KEY: supabaseStatus.ANON_KEY,
        NUXT_SUPABASE_SECRET_KEY: supabaseStatus.SERVICE_ROLE_KEY
      };
      const devLog = [];
      knitDevProcess = spawnManaged(
        "pnpm",
        [
          "-F",
          "web",
          "exec",
          "nuxt",
          "dev",
          "--dotenv",
          "../.env",
          "--host",
          "localhost",
          "--port",
          String(browserPort)
        ],
        { cwd: knitWorktree, env: browserEnvironment, stdio: ["ignore", "pipe", "pipe"] }
      );
      for (const stream of [knitDevProcess.stdout, knitDevProcess.stderr]) {
        stream.setEncoding("utf8");
        stream.on("data", (chunk) => devLog.push(chunk));
      }
      await waitForHttp(browserUrl, knitDevProcess, devLog);
      runGate("browserSignupFlowPassed", "pnpm", ["-F", "web", "test:e2e:local:required"], {
        cwd: knitWorktree,
        env: browserEnvironment
      });
      await stopProcess(knitDevProcess);
      knitDevProcess = undefined;
      run("pnpm", ["exec", "supabase", "stop", "--no-backup"], {
        cwd: knitWorktree,
        env: dockerEnvironment
      });
      supabaseStarted = false;
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
      finalReleaseGateRequired:
        qualificationResult !== "passed" || skipFullKnitUnit || !Object.values(gateResults).every(Boolean),
      gateResults,
      registryPolicy: {
        config: path.relative(repoRoot, registryConfigPath),
        loomaPackagePublicFallback: false,
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
    await stopProcess(knitDevProcess);
    if (supabaseStarted && knitWorktree) {
      spawnSync("pnpm", ["exec", "supabase", "stop", "--no-backup"], {
        cwd: knitWorktree,
        env: dockerEnvironment,
        stdio: "inherit"
      });
    }
    if (worktreeAttached) {
      run("git", ["-C", knitDirectory, "worktree", "remove", "--force", knitWorktree]);
    }
    if (temporaryRoot) {
      assert(
        temporaryRoot.startsWith(`${temporaryDirectory}${path.sep}knit-consumer-`),
        "refusing to remove an unexpected temporary directory"
      );
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }

  if (qualificationError) {
    process.stderr.write(`Qualification evidence: ${path.relative(repoRoot, evidencePath)}\n`);
    throw qualificationError;
  }
  process.stdout.write(`\nKnit consumed ${RELEASE_PACKAGE_NAME}@${RELEASE_VERSION} from the isolated registry.\n`);
  if (skipFullKnitUnit) {
    process.stdout.write("Inspection rehearsal only: the final release gate still requires an eligible manifest plus the complete Knit unit, browser, migration, and RLS suites.\n");
  }
  process.stdout.write(`Evidence: ${path.relative(repoRoot, evidencePath)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
