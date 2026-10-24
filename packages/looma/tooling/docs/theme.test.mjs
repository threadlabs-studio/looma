import assert from 'node:assert/strict';
import test from 'node:test';
import { themeFields, defaultRecipe, validateRecipe, themeCSS, startingPoints, startingPointFor } from './theme.mjs';

test('the twenty shared decisions round-trip without truncating native lengths or times', () => {
  assert.equal(themeFields.length, 20);
  const recipe = defaultRecipe();
  Object.assign(recipe.values, { 'control-size': '2.5rem', 'text-size': '1rem', 'response-time': '0.15s', 'space-curve': '2', 'scale-contrast': '1.25' });
  const parsed = validateRecipe(JSON.parse(JSON.stringify(recipe)));
  assert.deepEqual(parsed, recipe);
  const css = themeCSS(parsed);
  assert.match(css, /--ui-control-size: 2\.5rem/);
  assert.match(css, /--ui-motion-fast: 0\.15s/);
  assert.match(css, /--ui-space-curve: 2/);
  assert.match(css, /--ui-scale-ratio: 1\.25/);
  assert.match(css, /prefers-reduced-motion/);
  assert.ok(!css.includes('--ui-button-'));
});

test('rejects invalid recipes and CSS injection rather than producing partial styles', () => {
  for (const [key, value] of [['action', 'red; color:blue'], ['body-font', 'sans-serif;}body{color:red'], ['body-font', 'Arial /*'], ['body-font', '"Unclosed font'], ['control-size', '9'.repeat(400) + 'px'], ['control-size', '2rem trailing'], ['scale-contrast', '0'], ['translucency', '2'], ['response-curve', 'cubic-bezier(2,0,1,1)']]) {
    const recipe = defaultRecipe(); recipe.values[key] = value;
    assert.throws(() => validateRecipe(recipe), undefined, key);
  }
  assert.throws(() => validateRecipe({ schemaVersion: 100, values: {} }), /version/i);
  assert.throws(() => validateRecipe({ ...defaultRecipe(), values: { unknown: '1' } }), /unknown/i);
});

test('starting points change shared surfaces and depth never adds motion amplitude', () => {
  const clear = themeCSS(startingPoints.clear);
  const night = themeCSS(startingPoints.night);
  assert.notEqual(clear, night);
  assert.match(night, /--ui-surface: #11141c/);
  const recipe = defaultRecipe(); recipe.values['inner-depth'] = '2';
  const css = themeCSS(recipe);
  assert.match(css, /--ui-inner-depth: 2/);
  assert.ok(!css.includes('--ui-press-scale: 0.'));
});


test('saved and imported recipes identify their starting point without claiming a different preset', () => {
  assert.equal(startingPointFor(startingPoints.night), 'night');
  const recipe = defaultRecipe(); recipe.values.density = '1.17';
  assert.equal(startingPointFor(recipe), 'custom');
});
