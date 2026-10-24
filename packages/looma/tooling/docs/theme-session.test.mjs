import assert from 'node:assert/strict';
import test from 'node:test';
import { createThemeSession } from './theme-session.mjs';
import { defaultRecipe, startingPoints } from './theme.mjs';

function browser(storage = new Map()) {
  return Object.assign(new EventTarget(), {
    CustomEvent,
    document: { documentElement: { toggleAttribute() {} }, createElement: () => ({ dataset: {}, textContent: '' }), head: { append() {} } },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
  });
}
const config = { base: '/looma/', baseline: defaultRecipe(), systemCSS: '/* shared derivation */' };

test('a browser theme survives a fresh document, stays scoped, and resets to the project baseline', () => {
  const storage = new Map();
  const first = createThemeSession(browser(storage), config);
  first.apply(startingPoints.library);
  assert.match(first.css, /shared derivation/);
  assert.match(first.css, /--ui-accent: #2e1228/);
  const next = createThemeSession(browser(storage), config);
  assert.deepEqual(next.recipe, startingPoints.library);
  assert.equal(createThemeSession(browser(storage), { ...config, base: '/other/' }).hasOverride, false);
  next.baseline(startingPoints.garden);
  assert.deepEqual(next.reset(), startingPoints.garden);
  assert.equal(next.css, '');
  assert.equal(createThemeSession(browser(storage), config).hasOverride, false);
});

test('malformed stored themes and inaccessible browser storage cannot inject styles or prevent editing', () => {
  const storage = new Map([['looma:documentation-theme:v1:/looma/', '{broken']]);
  assert.equal(createThemeSession(browser(storage), config).hasOverride, false);
  const view = browser();
  Object.defineProperty(view, 'localStorage', { get() { throw new Error('Blocked'); } });
  const session = createThemeSession(view, config);
  session.apply(startingPoints.night);
  assert.match(session.css, /--ui-surface: #11141c/);
  assert.throws(() => session.apply({ schemaVersion: 1, values: { action: 'red; } body {}' } }));
  assert.deepEqual(session.recipe, startingPoints.night);
});
