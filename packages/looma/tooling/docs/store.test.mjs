import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, symlink, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createThemeStore } from './store.mjs';
import { defaultRecipe, startingPoints } from './theme.mjs';

const fixture = async run => {
  const root = await mkdtemp(path.join(tmpdir(), 'looma-theme-'));
  try { await run(root); } finally { await rm(root, { recursive: true, force: true }); }
};
test('saves a shared recipe and formula-based CSS, reloads it, and rejects stale edits', () => fixture(async root => {
  const store = await createThemeStore({ root });
  const initial = await store.read();
  assert.deepEqual(initial.recipe, defaultRecipe());
  const saved = await store.save({ recipe: startingPoints.night, revision: initial.revision });
  assert.notEqual(saved.revision, initial.revision);
  assert.deepEqual((await (await createThemeStore({ root })).read()).recipe, startingPoints.night);
  const css = await readFile(path.join(root, 'looma.theme.css'), 'utf8');
  assert.match(css, /--ui-surface: #11141c/);
  assert.match(css, /--ui-control-size-sm: calc/);
  await assert.rejects(store.save({ recipe: defaultRecipe(), revision: initial.revision }), /changed.*reload/i);
  await writeFile(path.join(root, 'looma.theme.css'), css + '\n/* manual edit */');
  await assert.rejects(store.save({ recipe: defaultRecipe(), revision: saved.revision }), /changed.*reload/i);
  assert.match(await readFile(path.join(root, 'looma.theme.css'), 'utf8'), /manual edit/);
}));
test('rejects invalid data before creating files and prevents paths through symlinks', () => fixture(async root => {
  const store = await createThemeStore({ root });
  await assert.rejects(store.save({ recipe: { ...defaultRecipe(), values: { canvas: 'red;}' } }, revision: (await store.read()).revision }), /valid colour/);
  await assert.rejects(readFile(path.join(root, 'looma.theme.json')), { code: 'ENOENT' });
  await assert.rejects(createThemeStore({ root, css: '../escape.css' }), /inside|relative/);
  await mkdir(path.join(root, 'outside'));
  await symlink(path.join(root, 'outside'), path.join(root, 'linked'));
  await assert.rejects(createThemeStore({ root, css: 'linked/theme.css' }), /symlink/i);
  await symlink(path.join(root, 'outside/target.css'), path.join(root, 'looma.theme.css'));
  await assert.rejects(store.read(), /symlink/i);
}));
test('serializes concurrent saves and leaves the winning recipe and CSS coherent', () => fixture(async root => {
  const first = await createThemeStore({ root });
  const second = await createThemeStore({ root });
  const { revision } = await first.read();
  const results = await Promise.allSettled([first.save({ recipe: startingPoints.night, revision }), second.save({ recipe: startingPoints.garden, revision })]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const current = await first.read();
  const css = await readFile(path.join(root, 'looma.theme.css'), 'utf8');
  assert.ok(css.includes(`--ui-surface: ${current.recipe.values.canvas};`));
}));
