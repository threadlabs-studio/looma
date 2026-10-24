import assert from 'node:assert/strict';
import test from 'node:test';
import { themeFields, defaultRecipe, validateRecipe, themeCSS, startingPoints, startingPointFor, deriveTheme } from './theme.mjs';

test('shared decisions round-trip without truncating native lengths or times', () => {
  assert.ok(themeFields.some(field => field.id === 'glassiness'));
  assert.ok(themeFields.some(field => field.id === 'surface-separation'));
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

test('material customization uses shared levers and starting points keep their public compatibility', () => {
  const recipe = defaultRecipe();
  Object.assign(recipe.values, { glassiness: '.8', 'surface-separation': '.6' });
  assert.match(themeCSS(recipe), /--ui-glassiness: .8/);
  assert.match(themeCSS(recipe), /--ui-surface-separation: .6/);
  assert.equal(startingPointFor(startingPoints.library), 'bookish');
  assert.equal(startingPointFor(startingPoints.wiki), 'wiki');
  assert.ok(parseFloat(startingPoints.wiki.values['control-size']) < parseFloat(startingPoints.clear.values['control-size']));
});

test('rejects invalid recipes and CSS injection rather than producing partial styles', () => {
  for (const [key, value] of [['action', 'red; color:blue'], ['body-font', 'sans-serif;}body{color:red'], ['body-font', 'Arial /*'], ['body-font', '"Unclosed font'], ['control-size', '9'.repeat(400) + 'px'], ['control-size', '2rem trailing'], ['scale-contrast', '0'], ['translucency', '2'], ['response-curve', 'cubic-bezier(2,0,1,1)']]) {
    const recipe = defaultRecipe(); recipe.values[key] = value;
    assert.throws(() => validateRecipe(recipe), undefined, key);
  }
  assert.throws(() => validateRecipe({ schemaVersion: 100, values: {} }), /version/i);
  assert.throws(() => validateRecipe({ ...defaultRecipe(), values: { unknown: '1' } }), /unknown/i);
});

test('all authoring paths share readable numeric bounds and retain useful native units', () => {
  for (const [key, value] of [['density', '.05'], ['scale-contrast', '12'], ['space-curve', '20'], ['text-size', '1px'], ['control-size', '8px'], ['response-time', '12s'], ['line-weight', '0px'], ['text-weight', '10']]) {
    const recipe = defaultRecipe(); recipe.values[key] = value;
    assert.throws(() => validateRecipe(recipe), undefined, `${key}: ${value}`);
    assert.throws(() => themeCSS(recipe), undefined, `export ${key}: ${value}`);
  }
  const responsive = defaultRecipe(); responsive.values['text-size'] = '2vw';
  assert.match(themeCSS(responsive), /--ui-font-size: clamp\(14px, 2vw, 24px\)/);
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

const luminance = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(s => s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
test('palette derivation repairs unreadable seeds across surface, text, outline and tone roles', () => {
  for (const colors of [
    { canvas: '#ffffff', surface: '#000000', text: '#ffffff', action: '#ffffcc' },
    { canvas: '#000000', surface: '#ffffff', text: '#000000', action: '#111111' },
    { canvas: '#808080', surface: '#888888', text: '#858585', action: '#888888' },
    { canvas: '#ff00ff', surface: '#00ffff', text: '#ffff00', action: '#ffffff' },
    ...Object.values(startingPoints).map(recipe => recipe.values),
  ]) {
    const recipe = { ...defaultRecipe(), values: { ...defaultRecipe().values, ...colors } };
    const { tokens, adjustments } = deriveTheme(recipe);
    const surfaces = ['--ui-surface', '--ui-surface-raised', '--ui-surface-sunken'].map(name => tokens[name]);
    for (const name of ['--ui-text', '--ui-text-secondary', '--ui-text-muted']) {
      for (const surface of surfaces) assert.ok(contrast(tokens[name], surface) >= 4.5, `${name} on ${surface}`);
    }
    for (const name of ['--ui-control-border', '--ui-focus-ring']) {
      for (const surface of surfaces) assert.ok(contrast(tokens[name], surface) >= 3, `${name} on ${surface}`);
    }
    for (const tone of ['accent', 'danger', 'success', 'warning', 'info']) {
      assert.ok(contrast(tokens[`--ui-${tone}`], tokens[`--ui-on-${tone}`]) >= 4.5, `${tone} solid`);
      for (const surface of surfaces) assert.ok(contrast(tokens[`--ui-${tone}-subtle-text`], surface) >= 4.5, `${tone} text on ${surface}`);
    }
    assert.ok(Array.isArray(adjustments));
    assert.deepEqual(recipe.values, { ...defaultRecipe().values, ...colors }, 'authoring seeds remain editable');
  }
});
