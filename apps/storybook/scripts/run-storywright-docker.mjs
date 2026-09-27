#!/usr/bin/env node
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { canonicalStorywrightEnv } from './storywright-runtime.mjs'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let repoRoot = appRoot

while (!existsSync(resolve(repoRoot, '.git')) && dirname(repoRoot) !== repoRoot) {
  repoRoot = dirname(repoRoot)
}

if (!existsSync(resolve(repoRoot, '.git'))) {
  console.error('Could not locate repository root from Storywright Docker runner.')
  process.exit(1)
}

const args = process.argv.slice(2)
const storywrightArgs = args.length > 0 ? args : ['test']
// Keep this tag in lockstep with the pinned @playwright/test version in
// package.json — a mismatch makes the preinstalled browser build unresolvable.
const image = process.env.STORYWRIGHT_DOCKER_IMAGE ?? 'mcr.microsoft.com/playwright:v1.60.0-noble'
const platform = process.env.STORYWRIGHT_DOCKER_PLATFORM ?? 'linux/amd64'
const volumePrefix = process.env.STORYWRIGHT_DOCKER_VOLUME_PREFIX ?? 'looma-storywright'
const hostUid = process.getuid?.()
const hostGid = process.getgid?.()
const appDirFromRepo = relative(repoRoot, appRoot)
// Every workspace project's node_modules is a Docker volume, not the bind
// mount: the container's Linux `pnpm install` would otherwise rewrite the
// host's workspace symlinks and break host tooling. Mirrors pnpm-workspace.yaml.
const workspaceDirs = ['packages', 'apps', 'tools'].flatMap((group) =>
  readdirSync(resolve(repoRoot, group), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(resolve(repoRoot, group, entry.name, 'package.json')))
    .map((entry) => `${group}/${entry.name}`))

const shellQuote = (value) => `'${String(value).replaceAll("'", "'\\''")}'`

const commandExists = (command) =>
  spawnSync('sh', ['-lc', `command -v ${shellQuote(command)} >/dev/null 2>&1`], { stdio: 'ignore' }).status === 0

const dockerInfoSucceeds = (env) =>
  spawnSync('docker', ['info'], { stdio: 'ignore', env }).status === 0

const dockerContextEnv = (context) => {
  const env = { ...process.env }
  env.DOCKER_CONTEXT = context
  delete env.DOCKER_HOST
  return env
}

const dockerHostEnv = (host) => {
  const env = { ...process.env }
  env.DOCKER_HOST = host
  delete env.DOCKER_CONTEXT
  return env
}

const isJenkins = () =>
  Boolean(process.env.JENKINS_URL || process.env.JENKINS_HOME || process.env.BUILD_TAG)

const isCiContainer = () =>
  existsSync('/.dockerenv') || existsSync('/run/.containerenv')

const shouldRunStorywrightDirect = () =>
  process.env.STORYWRIGHT_DOCKER_DIRECT === '1'
  || ((process.env.CI === 'true' || isJenkins()) && isCiContainer())

const shouldAutoStartColima = () =>
  process.env.STORYWRIGHT_DOCKER_AUTOSTART !== '0'
  && process.env.CI !== 'true'
  && !isJenkins()
  && process.platform === 'darwin'

function ensureDockerRuntime() {
  if (dockerInfoSucceeds(process.env)) {
    return { env: process.env, startedColima: false, colimaProfile: undefined }
  }

  if (!shouldAutoStartColima() || !commandExists('colima')) {
    return { env: process.env, startedColima: false, colimaProfile: undefined }
  }

  const colimaProfile = process.env.STORYWRIGHT_COLIMA_PROFILE ?? 'default'
  const dockerContext = process.env.STORYWRIGHT_DOCKER_CONTEXT
    ?? (colimaProfile === 'default' ? 'colima' : `colima-${colimaProfile}`)
  const colimaWasRunning = spawnSync('colima', ['status', colimaProfile], { stdio: 'ignore' }).status === 0
  let startedColima = false

  if (!colimaWasRunning) {
    console.log(`Starting Colima profile "${colimaProfile}" for Storywright...`)
    const startResult = spawnSync('colima', ['start', colimaProfile], { stdio: 'inherit' })

    if (startResult.error) {
      console.error(startResult.error.message)
      return { env: process.env, startedColima: false, colimaProfile }
    }

    if (startResult.status !== 0) {
      return { env: process.env, startedColima: false, colimaProfile }
    }

    startedColima = true
  }

  let env = dockerContextEnv(dockerContext)
  if (dockerInfoSucceeds(env)) {
    return { env, startedColima, colimaProfile }
  }

  const socketProfile = colimaProfile === 'default' ? 'default' : colimaProfile
  env = dockerHostEnv(`unix://${process.env.HOME}/.colima/${socketProfile}/docker.sock`)
  if (dockerInfoSucceeds(env)) {
    return { env, startedColima, colimaProfile }
  }

  return { env: process.env, startedColima, colimaProfile }
}

function stopManagedColima(runtime) {
  if (!runtime.startedColima || !runtime.colimaProfile) {
    return
  }

  console.log(`Stopping Colima profile "${runtime.colimaProfile}" after Storywright...`)
  const stopResult = spawnSync('colima', ['stop', runtime.colimaProfile], { stdio: 'inherit' })

  if (stopResult.error) {
    console.warn(`Could not stop Colima profile "${runtime.colimaProfile}": ${stopResult.error.message}`)
    return
  }

  if (stopResult.status !== 0) {
    console.warn(`Could not stop Colima profile "${runtime.colimaProfile}"; colima stop exited ${stopResult.status}.`)
  }
}

function restoreWorkspaceOwnership(dockerEnv) {
  if (typeof hostUid !== 'number' || typeof hostGid !== 'number') {
    return
  }

  // The container runs as root and package builds write dist, storybook-static,
  // and .storywright output on the bind mount. Chown the workspace tree back so
  // host tooling keeps write access. (node_modules and the pnpm store are
  // volumes.)
  const generatedPaths = [
    '/work/packages',
    '/work/apps',
    '/work/generated',
  ]
  const chownCommand = [
    'for path in',
    generatedPaths.map(shellQuote).join(' '),
    '; do [ ! -e "$path" ] || chown -R',
    `${hostUid}:${hostGid}`,
    '"$path"; done',
  ].join(' ')

  const result = spawnSync('docker', [
    'run',
    '--rm',
    '--platform',
    platform,
    '--workdir',
    '/work',
    '--volume',
    `${repoRoot}:/work`,
    image,
    'bash',
    '-lc',
    chownCommand,
  ], { stdio: 'inherit', env: dockerEnv })

  if (result.error) {
    console.warn(`Could not restore Storywright artifact ownership: ${result.error.message}`)
    return
  }

  if (result.status !== 0) {
    console.warn(`Could not restore Storywright artifact ownership; chown exited ${result.status}.`)
  }
}

function usesExistingStorybookBuild() {
  return storywrightArgs.some((arg) =>
    arg === '--storybook-dir'
    || arg.startsWith('--storybook-dir=')
    || arg === '--storybook-url'
    || arg.startsWith('--storybook-url='))
}

if (storywrightArgs[0] === 'test' || storywrightArgs[0] === 'update') {
  rmSync(resolve(appRoot, '.storywright/tmp'), { recursive: true, force: true })
  rmSync(resolve(appRoot, '.storywright/report'), { recursive: true, force: true })
  if (!usesExistingStorybookBuild()) {
    rmSync(resolve(appRoot, 'storybook-static'), { recursive: true, force: true })
  }
}

// corepack reads the root package.json `packageManager` field, so pnpm resolves
// to the pinned monorepo version without hardcoding it here.
const buildCommand = (appDir) => [
  'corepack enable',
  'pnpm config set store-dir /pnpm/store',
  'pnpm install --frozen-lockfile',
  `${canonicalStorywrightEnv}=1 pnpm --dir ${shellQuote(appDir)} exec storywright ${storywrightArgs.map(shellQuote).join(' ')}`,
].join(' && ')

const command = buildCommand(appDirFromRepo)

const dockerArgs = [
  'run',
  '--rm',
  '--init',
  '--ipc=host',
  '--platform',
  platform,
  '--workdir',
  '/work',
  '--volume',
  `${repoRoot}:/work`,
  '--volume',
  `${volumePrefix}-root-node-modules:/work/node_modules`,
  ...workspaceDirs.flatMap((dir) => [
    '--volume',
    `${volumePrefix}-${dir.replaceAll('/', '-')}-node-modules:/work/${dir}/node_modules`,
  ]),
  '--volume',
  `${volumePrefix}-pnpm-store:/pnpm/store`,
  '--env',
  'CI=1',
  '--env',
  'HOME=/tmp',
  '--env',
  'PLAYWRIGHT_BROWSERS_PATH=/ms-playwright',
  '--env',
  'PNPM_HOME=/pnpm',
  image,
  'bash',
  '-lc',
  command,
]

if (shouldRunStorywrightDirect()) {
  console.log('Running Storywright directly in the current CI/container environment...')
  const directResult = spawnSync('bash', ['-lc', command], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  })

  if (directResult.error) {
    console.error(directResult.error.message)
    process.exit(1)
  }

  process.exit(directResult.status ?? 1)
}

const runtime = ensureDockerRuntime()
const result = spawnSync('docker', dockerArgs, { stdio: 'inherit', env: runtime.env })
restoreWorkspaceOwnership(runtime.env)
stopManagedColima(runtime)

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

process.exit(result.status ?? 1)
