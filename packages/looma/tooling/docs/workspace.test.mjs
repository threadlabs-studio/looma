import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, symlink, link, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { cacheDirectory, withBuildLock } from './workspace.mjs';
import { tool } from './site.mjs';

const fixture = async run => {
  const directory = await mkdtemp(path.join(tmpdir(), 'looma-cache-'));
  try { await run(directory); } finally { await rm(directory, { recursive: true, force: true }); }
};
test('cache and tooling writes reject symlink escapes and do not change a hardlinked outside file', () => fixture(async directory => {
  const root = path.join(directory, 'project'), outside = path.join(directory, 'outside');
  await mkdir(root); await mkdir(outside);
  await writeFile(path.join(outside, 'vite.mjs'), 'Keep this file.');
  await symlink(outside, path.join(root, '.looma'));
  await assert.rejects(tool('vite', root), /symlink/);
  assert.equal(await readFile(path.join(outside, 'vite.mjs'), 'utf8'), 'Keep this file.');
  await rm(path.join(root, '.looma'));
  const tools = await cacheDirectory(root, 'tooling');
  await link(path.join(outside, 'vite.mjs'), path.join(tools, 'vite.mjs'));
  // This isolated root has no optional peer. Resolution fails after the safe wrapper replacement.
  await assert.rejects(tool('vite', root), /vite/);
  assert.equal(await readFile(path.join(outside, 'vite.mjs'), 'utf8'), 'Keep this file.');
  assert.match(await readFile(path.join(tools, 'vite.mjs'), 'utf8'), /export \* from "vite"/);
}));

test('build ownership is exclusive and releases on success and failure', () => fixture(async root => {
  let release, acquired;
  const ready = new Promise(resolve => { acquired = resolve; });
  const first = withBuildLock(root, () => { acquired(); return new Promise(resolve => { release = resolve; }); });
  await ready;
  await assert.rejects(withBuildLock(root, () => {}), /Another documentation build/);
  release(); await first;
  await assert.rejects(withBuildLock(root, () => { throw new Error('Broken source'); }), /Broken source/);
  assert.equal(await withBuildLock(root, () => 42), 42);
}));
