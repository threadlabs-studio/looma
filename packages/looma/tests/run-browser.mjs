import "./sdk-loader.mjs";
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { pressureInputs } from './renderers/pressure-inputs.mjs';
import { startSuiteBrowsers } from './renderers/browser-pool.ts';

const require = createRequire(import.meta.url);
const vitest = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
const targets = process.env.LOOMA_TEST_TARGET ? [process.env.LOOMA_TEST_TARGET] : ['html-next', 'vue', 'react', 'preact', 'svelte', 'angular'];
const run = (args, env) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [vitest, 'run', ...args], { stdio: 'inherit', env });
  child.once('error', reject);
  child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`Browser tests failed (${signal ?? code}).`)));
});
const failures = [];
if (!process.env.CI && process.env.LOOMA_PARALLEL_SCENARIOS === undefined) process.env.LOOMA_PARALLEL_SCENARIOS = "1";
const closeBrowsers = await startSuiteBrowsers();
try {
for (const target of targets) {
  process.env.LOOMA_TEST_TARGET = target;
  // Preparation is imported after choosing the target. Each target runs in its own process below.
  if (targets.length > 1) {
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [import.meta.filename, ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, LOOMA_TEST_TARGET: target } });
      child.once('error', reject);
      child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${target} browser tests failed (${code}).`)));
    }).catch(error => failures.push(error));
    continue;
  }
  if (process.env.LOOMA_PRESSURE_LIBRARIES) {
    const prepared = JSON.parse(await readFile(process.env.LOOMA_PRESSURE_LIBRARIES, 'utf8'));
    if (path.resolve(prepared.root) !== process.cwd()) throw new Error('Restore pressure artifacts at their preparation checkout path.');
    if (prepared.inputs !== await pressureInputs()) throw new Error("Prepared pressure libraries are stale. Prepare again after changing source, dependencies, adapters or built SDK output.");
    if (!prepared.libraries[target]) throw new Error(`No prepared pressure library for ${target}.`);
    process.env.LOOMA_PREPARED_LIBRARY = prepared.libraries[target];
  }
  const { default: prepare } = await import('./renderers/prepare-library.ts');
  const release = await prepare();
  try {
    const env = { ...process.env };
    const workers = process.env.CI ? [] : ['--maxWorkers=1'];
    await run(['--project', 'converted-source', ...(process.env.LOOMA_PARALLEL_SCENARIOS === '1' ? ['--sequence.concurrent', `--maxConcurrency=${process.env.LOOMA_SCENARIO_CONCURRENCY ?? 4}`] : []), ...workers, ...process.argv.slice(2)], env).catch(error => failures.push(error));
    await run(['--config', 'vitest.browser.config.ts', ...workers, ...process.argv.slice(2)], env).catch(error => failures.push(error));
  } finally {
    await release?.();
  }
}

} finally { await closeBrowsers(); }

if (failures.length) throw new AggregateError(failures, "Looma renderer qualification failed.");
