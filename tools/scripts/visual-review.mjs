import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { availableParallelism } from 'node:os';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { affectedComponents, affectedModules } from './ci-selection.mjs';
import { stateSheetComparison } from '../../apps/storybook/scripts/state-sheet-comparison.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const captureDriverFiles = [
  'tools/scripts/visual-review.mjs',
  'tools/scripts/ci-selection.mjs',
  'apps/storybook/scripts/run-storywright-docker.mjs',
  'apps/storybook/scripts/storywright-runtime.mjs',
  'apps/storybook/scripts/state-sheet-comparison.mjs',
  'apps/docs/scripts/browser.mjs',
];
const sha = data => createHash('sha256').update(data).digest('hex');
const git = (directory, args) => execFileSync('git', ['-c', `safe.directory=${directory}`, ...args], {
  cwd: directory,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 ** 2,
}).trim();
const componentTag = file => /^packages\/looma\/src\/components\/(ui-[\w-]+)\//.exec(file)?.[1];
const isBaselinePath = file => /^apps\/(?:docs|storybook)\/tests\/baselines\/.*\.png$/.test(file);
const isRenderInput = file => !isBaselinePath(file)
  && /^(?:packages\/looma\/|apps\/(?:storybook|docs)\/|tools\/scripts\/(?:visual-review|ci-selection)|(?:package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml)$)/.test(file);
const imageNames = directory => existsSync(directory)
  ? readdirSync(directory, { recursive: true })
    .filter(name => name.endsWith('.png') && name.split(path.sep)[0] !== 'test-results')
    .sort()
  : [];
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));
const run = (directory, command, args, env = {}) => {
  const result = spawnSync(command, args, {
    cwd: directory,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status})`);
};

export function selectVisualComponents(files, changes) {
  const all = [...new Set(Object.keys(files).map(componentTag).filter(Boolean))].sort();
  const sharedRenderingChanged = changes.some(file => /^(?:pnpm-lock\.yaml|package\.json|pnpm-workspace\.yaml|packages\/looma\/(?:build\.mjs|package\.json|src\/tokens\/)|apps\/storybook\/|apps\/docs\/(?:src\/|static\/|tests\/(?!baselines\/))|tools\/scripts\/visual-review)/.test(file)
    || (file.startsWith('packages/looma/tooling/docs/') && !file.endsWith('.md')));
  if (sharedRenderingChanged) return all;

  const reached = affectedModules(files, changes);
  const seeds = [...new Set(reached.map(componentTag).filter(Boolean))];
  if (changes.some(file => file.startsWith('packages/looma/src/components/shared/')) && !seeds.length) return all;
  return affectedComponents(files, affectedComponents(files, seeds), true);
}

export function renderInputKey(files, renderer, suite = 'storybook') {
  return sha(JSON.stringify({
    suite,
    renderer,
    files: Object.entries(files).filter(([file]) => isRenderInput(file)).sort(([a], [b]) => a.localeCompare(b)),
  }));
}

export function assertNoTrackedBaselines(directory, base) {
  const tracked = git(directory, ['ls-files', '-z', '--', 'apps/docs/tests/baselines', 'apps/storybook/tests/baselines'])
    .split('\0').filter(file => file.endsWith('.png'));
  if (tracked.length) throw new Error(`Baseline PNGs must not be stored in Git: ${tracked.slice(0, 4).join(', ')}`);
  if (base) {
    const available = spawnSync('git', ['cat-file', '-e', `${base}^{commit}`], {
      cwd: directory,
      stdio: 'ignore',
    }).status === 0;
    const introduced = git(directory, [
      'log', '-m', '--format=', '--name-only', '--diff-filter=AMCR', 'HEAD', ...(available ? [`^${base}`] : []),
      '--', 'apps/docs/tests/baselines', 'apps/storybook/tests/baselines',
    ]).split('\n').filter(file => file.endsWith('.png'));
    if (introduced.length) throw new Error(`Baseline PNG history must not be reintroduced: ${introduced.slice(0, 4).join(', ')}`);
  }
}

export function sealCapture(directory, key, metadata = {}) {
  const files = Object.fromEntries(imageNames(directory).map(name => [name, sha(readFileSync(path.join(directory, name)))]));
  writeFileSync(path.join(directory, 'capture.json'), JSON.stringify({
    key,
    files,
    empty: Object.keys(files).length === 0,
    ...metadata,
  }, null, 2) + '\n');
}
export function validCapture(directory, key) {
  try {
    const manifest = JSON.parse(readFileSync(path.join(directory, 'capture.json'), 'utf8'));
    return manifest.key === key
      && (Object.keys(manifest.files).length > 0 || manifest.empty === true)
      && Object.entries(manifest.files).every(([name, hash]) => !path.isAbsolute(name)
        && !name.split(/[\\/]/).includes('..')
        && sha(readFileSync(path.join(directory, name))) === hash);
  } catch {
    return false;
  }
}

function comparisonRows(before, after, output, suite, names) {
  mkdirSync(output, { recursive: true });
  const require = createRequire(process.env.LOOMA_VISUAL_COMPARATOR_ROOT
    ? path.join(path.resolve(process.env.LOOMA_VISUAL_COMPARATOR_ROOT), 'package.json')
    : path.join(root, 'apps/storybook/package.json'));
  const testRequire = createRequire(require.resolve('@playwright/test'));
  const playwright = createRequire(testRequire.resolve('playwright'));
  const compare = playwright('playwright-core/lib/coreBundle').utils.getComparator('image/png');
  const old = new Set(imageNames(before));
  const current = new Set(imageNames(after));

  return names.map(name => {
    const beforeImage = old.has(name) ? readFileSync(path.join(before, name)) : null;
    const afterImage = current.has(name) ? readFileSync(path.join(after, name)) : null;
    let difference;
    if (beforeImage && afterImage && !beforeImage.equals(afterImage)) {
      difference = compare(afterImage, beforeImage, suite === 'docs'
        ? { comparator: 'pixelmatch', maxDiffPixels: 0 }
        : { ...stateSheetComparison, comparator: stateSheetComparison._comparator });
    }
    const kind = !beforeImage ? 'added' : !afterImage ? 'removed' : difference ? 'changed' : 'unchanged';
    if (kind === 'unchanged') return { name, kind, row: null };

    const slug = sha(name).slice(0, 16);
    const images = [];
    for (const [label, data] of [['before', beforeImage], ['after', afterImage], ['diff', difference?.diff]]) {
      if (!data) continue;
      const file = `${slug}-${label}.png`;
      writeFileSync(path.join(output, file), data);
      images.push(`<figure><figcaption>${label}</figcaption><img src="${file}" alt="${escapeHtml(name)} ${label}"></figure>`);
    }
    return { name, kind, row: `<section><h2>${escapeHtml(name)} — ${kind}</h2>${difference?.errorMessage ? `<p>${escapeHtml(difference.errorMessage)}</p>` : ''}<div>${images.join('')}</div></section>` };
  });
}

// Comparisons are CPU-bound. Keep their existing semantics while sharing a full
// theme sweep across the runner's cores, within the final CI gate's time budget.
export async function compareCaptures(before, after, output, suite = 'storybook', workers = Math.min(4, availableParallelism())) {
  mkdirSync(output, { recursive: true });
  const names = [...new Set([...imageNames(before), ...imageNames(after)])].sort();
  const count = Math.max(1, Math.min(workers, names.length));
  let entries;
  if (count === 1) entries = comparisonRows(before, after, output, suite, names);
  else {
    const pool = [];
    try {
      const batches = Array.from({ length: count }, (_, index) => names.filter((_, offset) => offset % count === index));
      entries = (await Promise.all(batches.map(names => new Promise((resolve, reject) => {
        const worker = new Worker(new URL(import.meta.url), { workerData: { visualComparison: { before, after, output, suite, names } } });
        pool.push(worker);
        worker.once('message', resolve);
        worker.once('error', reject);
        worker.once('exit', code => reject(new Error(`Visual comparison worker exited before returning a result (code ${code})`)));
      })))).flat().sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
    } finally {
      await Promise.all(pool.map(worker => worker.terminate()));
    }
  }
  const result = { unchanged: [], changed: [], added: [], removed: [] };
  const rows = [];
  for (const { name, kind, row } of entries) {
    result[kind].push(name);
    if (row) rows.push(row);
  }
  writeFileSync(path.join(output, 'comparison.json'), JSON.stringify(result, null, 2) + '\n');
  writeFileSync(path.join(output, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Visual review</title><style>body{font:16px system-ui;margin:24px}section{border-top:1px solid #ccc;padding-block:16px}section>div{display:flex;gap:16px;overflow:auto}figure{margin:0;min-width:240px}img{max-width:600px;vertical-align:top}</style><h1>Visual review</h1><p>${result.changed.length} changed; ${result.added.length} added; ${result.removed.length} removed; ${result.unchanged.length} unchanged.</p><p>Images are regenerated from the base and candidate sources. Visual differences are reviewed in the PR; rendering and functional failures remain errors.</p>${rows.join('') || '<p>No visual differences.</p>'}`);
  return result;
}

function treeFiles(revision) {
  return Object.fromEntries(git(root, ['ls-tree', '-r', revision]).split('\n').filter(Boolean).map(line => {
    const [, hash, file] = /^\d+ blob ([a-f0-9]+)\t(.*)$/.exec(line) ?? [];
    return [file, hash];
  }).filter(([file]) => file));
}

function sourceFiles(revision) {
  const files = treeFiles(revision);
  const wanted = Object.keys(files).filter(file => /^packages\/looma\/src\/components\//.test(file) && /\.(?:html|[cm]?js|ts)$/.test(file));
  if (!wanted.length) return files;

  const batch = execFileSync('git', ['cat-file', '--batch'], {
    cwd: root,
    input: wanted.map(file => files[file]).join('\n') + '\n',
    maxBuffer: 64 * 1024 ** 2,
  });
  let offset = 0;
  for (const file of wanted) {
    const end = batch.indexOf(10, offset);
    const size = Number(batch.subarray(offset, end).toString().split(' ')[2]);
    files[file] = batch.subarray(end + 1, end + 1 + size).toString();
    offset = end + size + 2;
  }
  return files;
}

export function reviewPlan(base, suite = 'storybook', shard = '1/1') {
  const head = git(root, ['rev-parse', 'HEAD']);
  const available = spawnSync('git', ['cat-file', '-e', `${base}^{commit}`], { cwd: root, stdio: 'ignore' }).status === 0;
  if (!available && process.env.GITHUB_EVENT_NAME === 'push' && process.env.GITHUB_EVENT_PATH) {
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    // A history-only force push can name a pre-rewrite object absent from fresh clones.
    if (event.forced && event.ref === 'refs/heads/main' && event.before === base) base = `${head}^`;
  }
  base = git(root, ['rev-parse', '--verify', `${base}^{commit}`]);
  const workingNames = git(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
  const currentTree = treeFiles(head);
  const currentSources = sourceFiles(head);
  const objectFormat = git(root, ['rev-parse', '--show-object-format']);
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(file => file && isRenderInput(file));

  for (const file of new Set([...Object.keys(currentTree), ...workingNames])) {
    if (!isRenderInput(file)) continue;
    const absolute = path.join(root, file);
    if (!existsSync(absolute)) {
      delete currentTree[file];
      delete currentSources[file];
      continue;
    }
    const bytes = readFileSync(absolute);
    currentTree[file] = createHash(objectFormat).update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    if (componentTag(file) && /\.(?:html|[cm]?js|ts)$/.test(file)) currentSources[file] = bytes.toString();
  }

  const changed = [...new Set([...git(root, ['diff', '--name-only', base]).split('\n').filter(Boolean), ...untracked])];
  const files = { ...sourceFiles(base), ...currentSources };
  const components = selectVisualComponents(files, changed);
  const renderer = sha(captureDriverFiles.map(file => readFileSync(path.join(root, file))).join('\n'));
  const keys = Object.fromEntries([['base', base], ['head', head]].map(([side, ref]) => [
    side,
    renderInputKey(side === 'head' ? currentTree : treeFiles(ref), `${renderer}:${suite}:${shard}:${components.join(',')}`, suite),
  ]));
  return {
    schemaVersion: 1,
    base,
    head,
    workingTree: git(root, ['diff', '--name-only', 'HEAD']).split('\n').some(file => isRenderInput(file)) || untracked.length > 0,
    suite,
    shard,
    components,
    keys,
  };
}

/** Render the checkout's authored scenarios; update writes only to an isolated snapshot directory. */
async function capture(directory, suite, output, shard, components) {
  const app = path.join(directory, 'apps', suite === 'storybook' ? 'storybook' : 'docs');
  const config = path.join(directory, '.context', 'visual-review-config.mts');
  mkdirSync(path.dirname(config), { recursive: true });
  const original = suite === 'storybook' ? 'state-sheets.config.ts' : 'playwright.config.ts';
  const scenarioFile = suite === 'storybook' ? 'state-sheets.spec.ts' : 'docs-fixture.ts';
  const legacy = !readFileSync(path.join(app, 'tests', scenarioFile), 'utf8').includes('LOOMA_VISUAL_OUTPUT_DIR');
  writeFileSync(config, `import original from ${JSON.stringify(path.join(app, original))};\nexport default {...original,testDir:${JSON.stringify(path.join(app, 'tests'))},outputDir:${JSON.stringify(path.join(output, 'test-results'))},${legacy ? `snapshotPathTemplate:${JSON.stringify(path.join(output, '{arg}{ext}'))},` : ''}reporter:[['list'],['json',{outputFile:${JSON.stringify(path.join(output, 'tests.json'))}}]],webServer:original.webServer?{...original.webServer,cwd:${JSON.stringify(app)}}:undefined};\n`);
  const baseArgs = ['exec', 'playwright', 'test', '--config', config, '--workers=1', ...(suite === 'docs' ? ['--project=visual'] : [])];
  const environment = {
    ...process.env,
    STORYWRIGHT_CANONICAL_RUNTIME: '1',
    LOOMA_DOCS_CANONICAL: '1',
    LOOMA_DOCS_REPORT: 'visual',
    LOOMA_VISUAL_OUTPUT_DIR: output,
  };
  const listing = execFileSync('pnpm', [...baseArgs, '--list', '--reporter=json'], {
    cwd: app,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 ** 2,
    env: environment,
  });
  const names = [];
  const visit = suites => {
    for (const entry of suites ?? []) {
      for (const spec of entry.specs ?? []) names.push(spec.title);
      visit(entry.suites);
    }
  };
  visit(JSON.parse(listing).suites);
  const [part, total] = shard.split('/').map(Number);
  const filtered = names.filter(name => suite === 'docs' || components.some(tag => name.startsWith(tag + ' ')))
    .filter(name => Number.parseInt(sha(name).slice(0, 8), 16) % total === part - 1);
  mkdirSync(output, { recursive: true });
  if (!filtered.length) {
    writeFileSync(path.join(output, 'empty.json'), '{}\n');
    return;
  }
  const pattern = '(?:^|\\s)(?:' + filtered.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')$';
  run(app, 'pnpm', [...baseArgs, '--grep', pattern, `--update-snapshots=${legacy ? 'all' : 'none'}`], environment);
}

function renderSide(plan, side, output) {
  if (!['base', 'head'].includes(side)) throw new Error('Choose base or head');
  if (validCapture(output, plan.keys[side])) {
    sealCapture(output, plan.keys[side], { plan, side });
    return;
  }
  if (!output.startsWith(path.join(root, '.context') + path.sep)) throw new Error('Render output must be inside .context');
  rmSync(output, { recursive: true, force: true });
  mkdirSync(output, { recursive: true });
  if (plan.suite === 'storybook' && !plan.components.length) {
    sealCapture(output, plan.keys[side], { plan, side });
    return;
  }
  const temporary = side === 'base';
  const checkout = temporary ? path.join(root, '.context', `visual-base-${plan.shard.replace('/', '-')}`) : root;
  const capturePath = temporary ? path.join(checkout, '.context', 'capture') : output;
  let createdWorktree = false;
  try {
    if (temporary) {
      git(root, ['worktree', 'add', '--detach', checkout, plan.base]);
      createdWorktree = true;
      // Both source revisions use the candidate's capture driver and canonical rendering image.
      for (const file of captureDriverFiles) {
        mkdirSync(path.dirname(path.join(checkout, file)), { recursive: true });
        copyFileSync(path.join(root, file), path.join(checkout, file));
      }
    }
    const flags = [
      `--suite=${plan.suite}`,
      `--output=${path.relative(checkout, capturePath)}`,
      `--shard=${plan.shard}`,
      `--components=${plan.components.join(',')}`,
      `--key=${plan.keys[side]}`,
    ];
    run(checkout, 'node', plan.suite === 'storybook'
      ? ['apps/storybook/scripts/run-storywright-docker.mjs', 'capture', ...flags]
      : ['apps/docs/scripts/browser.mjs', 'capture', ...flags]);
    if (temporary) {
      for (const name of [...imageNames(capturePath), 'capture.json']) {
        const target = path.join(output, name);
        mkdirSync(path.dirname(target), { recursive: true });
        copyFileSync(path.join(capturePath, name), target);
      }
    }
    sealCapture(output, plan.keys[side], { plan, side });
  } finally {
    if (createdWorktree) git(root, ['worktree', 'remove', '--force', checkout]);
  }
}

async function aggregateArtifacts(directory, output) {
  const merged = { base: path.join(output, 'base'), head: path.join(output, 'head') };
  for (const destination of Object.values(merged)) mkdirSync(destination, { recursive: true });
  const artifacts = readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.startsWith('visual-capture-'));
  if (!artifacts.length) throw new Error('Visual capture artifacts are missing');

  const groups = new Map();
  for (const artifact of artifacts) {
    const source = path.join(directory, artifact.name);
    const capture = JSON.parse(readFileSync(path.join(source, 'capture.json'), 'utf8'));
    const { plan, side } = capture;
    if (!plan || !['base', 'head'].includes(side) || !validCapture(source, plan.keys[side])) {
      throw new Error(`Incomplete visual capture: ${artifact.name}`);
    }
    const group = groups.get(plan.shard) ?? {};
    if (group[side]) throw new Error(`Duplicate ${side} capture for shard ${plan.shard}`);
    group[side] = plan;
    groups.set(plan.shard, group);

    for (const name of imageNames(source)) {
      const target = path.join(merged[side], name);
      mkdirSync(path.dirname(target), { recursive: true });
      if (existsSync(target) && !readFileSync(target).equals(readFileSync(path.join(source, name)))) {
        throw new Error(`Conflicting visual capture: ${name}`);
      }
      copyFileSync(path.join(source, name), target);
    }
  }

  const first = groups.values().next().value.head;
  for (const [shard, pair] of groups) {
    if (!pair.base || !pair.head || JSON.stringify(pair.base) !== JSON.stringify(pair.head)
      || pair.head.base !== first.base || pair.head.head !== first.head || pair.head.suite !== first.suite) {
      throw new Error(`Visual source pair is incomplete: ${shard}`);
    }
  }
  if (groups.size !== Number(first.shard.split('/')[1])) throw new Error('Visual review is missing a shard');

  const result = await compareCaptures(merged.base, merged.head, path.join(output, 'report'), first.suite);
  writeFileSync(path.join(output, 'report', 'sources.json'), JSON.stringify(first, null, 2) + '\n');
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { changed, added, removed, unchanged } = result;
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Visual review: ${changed.length} changed, ${added.length} added, ${removed.length} removed, ${unchanged.length} unchanged. Download the visual-review artifact for before/after/diff images. Rendering and functional checks passed.\n`);
  }
  return result;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const options = new Set(['suite', 'shard', 'base', 'components', 'output', 'side', 'plan', 'key', 'input']);
  for (const arg of args.filter(arg => arg.startsWith('--'))) {
    if (!/^--[^=]+=/.test(arg) || !options.has(arg.slice(2, arg.indexOf('=')))) {
      throw new Error(`Unknown visual-review option: ${arg}`);
    }
  }
  const flag = (name, fallback) => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
  const suite = flag('suite', 'storybook');
  const shard = flag('shard', '1/1');
  const [part, total] = shard.split('/').map(Number);
  if (!['storybook', 'docs'].includes(suite) || !/^\d+\/\d+$/.test(shard) || part < 1 || total < part) {
    throw new Error('Choose docs/storybook and --shard=current/total');
  }

  if (command === 'check') {
    assertNoTrackedBaselines(root, flag('base', process.env.GITHUB_BASE_SHA));
    return;
  }
  if (command === 'plan') {
    const base = flag('base', process.env.GITHUB_BASE_SHA ?? 'origin/main');
    const plan = reviewPlan(base, suite, shard);
    const target = flag('output', path.join(root, '.context', 'visual-review-plan.json'));
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(plan, null, 2) + '\n');
    if (process.env.GITHUB_OUTPUT) {
      for (const [name, value] of Object.entries({
        base: plan.base,
        head: plan.head,
        base_key: plan.keys.base,
        head_key: plan.keys.head,
        selected: suite === 'docs' || plan.components.length > 0,
      })) {
        appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
      }
    }
    return;
  }
  if (command === 'capture') {
    const output = path.resolve(root, flag('output'));
    await capture(root, suite, output, shard, flag('components', '').split(',').filter(Boolean));
    sealCapture(output, flag('key'));
    return;
  }
  if (command === 'render-side') {
    const plan = JSON.parse(readFileSync(flag('plan', path.join(root, '.context', 'visual-review-plan.json')), 'utf8'));
    renderSide(plan, flag('side', 'head'), path.resolve(flag('output', path.join(root, '.context', 'visual-capture'))));
    return;
  }
  if (command === 'install-comparator') {
    const version = JSON.parse(readFileSync(path.join(root, 'apps/storybook/package.json'), 'utf8')).devDependencies['@playwright/test'];
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('The comparison runtime must use an exact Playwright version');
    const directory = path.join(root, '.context', 'visual-comparator');
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ private: true }));
    run(root, 'pnpm', ['--dir', directory, 'add', '--ignore-workspace', '--ignore-scripts', `@playwright/test@${version}`]);
    return;
  }
  if (command === 'report') {
    await aggregateArtifacts(path.resolve(flag('input')), path.resolve(flag('output')));
    return;
  }
  if (command === 'run') {
    const base = flag('base', git(root, ['merge-base', 'origin/main', 'HEAD']));
    const plan = reviewPlan(base, suite, shard);
    if (flag('components')) plan.components = flag('components').split(',');
    for (const side of ['base', 'head']) plan.keys[side] = sha(plan.keys[side] + plan.components.join(','));
    const directory = path.join(root, '.context', 'visual-review', suite);
    for (const side of ['base', 'head']) renderSide(plan, side, path.join(directory, side));
    console.log(JSON.stringify(await compareCaptures(path.join(directory, 'base'), path.join(directory, 'head'), path.join(directory, 'report'), suite)));
    return;
  }
  if (command === 'compare') {
    console.log(JSON.stringify(await compareCaptures(path.resolve(args[0]), path.resolve(args[1]), path.resolve(args[2]))));
    return;
  }
  throw new Error('Choose plan, render-side, capture, compare, report, run, install-comparator, or check');
}

if (!isMainThread && workerData?.visualComparison) {
  const { before, after, output, suite, names } = workerData.visualComparison;
  parentPort.postMessage(comparisonRows(before, after, output, suite, names));
} else if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
