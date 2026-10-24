import assert from 'node:assert/strict';
import test from 'node:test';
import { themeFields, defaultRecipe, validateRecipe, themeCSS, startingPoints, startingPointFor, deriveTheme, themePalettes, paletteFor, applyRefinement, refinementState, materialPresets } from './theme.mjs';

test('material presets retain their identity through refinement, reload and scoped restore', () => {
  assert.deepEqual(refinementState(startingPoints.bookish, 'material'), { id: 'glass', customized: false });
  const recipe = applyRefinement(startingPoints.wiki, 'material', 'polished');
  assert.equal(recipe.values.action, startingPoints.wiki.values.action);
  assert.equal(recipe.values['control-size'], startingPoints.wiki.values['control-size']);
  assert.deepEqual(refinementState(recipe, 'material'), { id: 'polished', customized: false });
  recipe.values['light-x'] = '.2';
  const reloaded = validateRecipe(JSON.parse(JSON.stringify(recipe)));
  assert.deepEqual(refinementState(reloaded, 'material'), { id: 'polished', customized: true });
  const restored = applyRefinement(reloaded, 'material', 'polished');
  assert.equal(restored.values['light-x'], materialPresets.polished.values['light-x']);
  assert.equal(restored.values['control-size'], startingPoints.wiki.values['control-size']);
  assert.equal(refinementState(restored, 'material').customized, false);
});

test('old recipes receive bounded lighting defaults and exports carry the shared lighting model', () => {
  const legacy = { schemaVersion: 1, values: { action: '#2e1228' } };
  const recipe = validateRecipe(legacy);
  for (const id of ['light-x', 'light-y', 'light-spread', 'light-strength', 'finish', 'glow']) {
    assert.ok(Object.hasOwn(recipe.values, id));
    assert.throws(() => validateRecipe({ ...recipe, values: { ...recipe.values, [id]: '1.1' } }));
  }
  assert.match(themeCSS(applyRefinement(recipe, 'material', 'polished')), /--ui-finish: /);
  assert.throws(() => applyRefinement(recipe, 'material', 'made-up'));
  assert.throws(() => validateRecipe({ ...recipe, presets: { material: 'made-up' } }));
});

test('shared decisions round-trip without truncating native lengths or times', () => {
  assert.ok(themeFields.some(field => field.id === 'glassiness'));
  assert.ok(themeFields.some(field => field.id === 'surface-separation'));
  const recipe = defaultRecipe();
  Object.assign(recipe.values, { 'control-size': '2.5rem', 'text-size': '1rem', 'response-time': '0.15s', 'space-curve': '2', 'scale-contrast': '1.25' });
  const parsed = validateRecipe(JSON.parse(JSON.stringify(recipe)));
  assert.deepEqual(parsed, recipe);
  const css = themeCSS(parsed);
  assert.match(css, /--ui-control-size: clamp\(32px, 2\.5rem, 64px\)/);
  assert.match(css, /--ui-motion-fast: 0\.15s/);
  assert.match(css, /--ui-space-curve: 2/);
  assert.match(css, /--ui-scale-ratio: 1\.25/);
  assert.match(css, /prefers-reduced-motion/);
  assert.ok(!css.includes('--ui-button-'));
});

test('material customization uses shared levers and exposes only current starting point names', () => {
  const recipe = defaultRecipe();
  Object.assign(recipe.values, { glassiness: '.8', 'surface-separation': '.6' });
  assert.match(themeCSS(recipe), /--ui-glassiness: .8/);
  assert.match(themeCSS(recipe), /--ui-surface-separation: .6/);
  assert.equal(startingPointFor(startingPoints.bookish), 'bookish');
  assert.equal(Object.hasOwn(startingPoints, 'library'), false);
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
  assert.match(night, /--ui-surface: light-dark\([^,]+, #11141c\)/);
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

test('neutral fills stay in the surface family and reflection peaks remain readable in both modes', () => {
  for (const recipe of Object.values(startingPoints)) for (const mode of ['light', 'dark']) {
    const { tokens } = deriveTheme(recipe, { mode });
    assert.notEqual(tokens['--ui-neutral-surface'], tokens['--ui-text']);
    assert.ok(contrast(tokens['--ui-neutral-surface'], tokens['--ui-text']) >= 4.5);
    assert.ok(contrast(tokens['--ui-surface-reflection'], tokens['--ui-text']) >= 4.5);
    for (const tone of ['accent', 'danger', 'success', 'warning', 'info']) {
      assert.ok(contrast(tokens[`--ui-${tone}-reflection`], tokens[`--ui-on-${tone}`]) >= 4.5, `${mode} ${tone}`);
    }
  }
});
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
    for (const name of ['--ui-text', '--ui-text-secondary', '--ui-text-muted', '--ui-disabled-text']) {
      for (const surface of surfaces) assert.ok(contrast(tokens[name], surface) >= 4.5, `${name} on ${surface}`);
    }
    for (const name of ['--ui-control-border', '--ui-focus-ring']) {
      for (const surface of surfaces) assert.ok(contrast(tokens[name], surface) >= 3, `${name} on ${surface}`);
    }
    for (const tone of ['accent', 'danger', 'success', 'warning', 'info']) {
      for (const state of ['', '-hover', '-active']) assert.ok(contrast(tokens[`--ui-${tone}${state}`], tokens[`--ui-on-${tone}`]) >= 4.5, `${tone}${state} solid`);
      for (const surface of surfaces) assert.ok(contrast(tokens[`--ui-${tone}-subtle-text`], surface) >= 4.5, `${tone} text on ${surface}`);
    }
    assert.ok(Array.isArray(adjustments));
    assert.deepEqual(recipe.values, { ...defaultRecipe().values, ...colors }, 'authoring seeds remain editable');
  }
});


test('every recipe exports a coordinated pair and both resolved palettes remain readable', () => {
  for (const recipe of Object.values(startingPoints)) {
    for (const mode of ['light', 'dark']) {
      const { tokens } = deriveTheme(recipe, { mode });
      assert.equal(tokens['color-scheme'], mode);
      for (const surface of ['--ui-surface', '--ui-surface-raised', '--ui-surface-sunken']) {
        assert.ok(contrast(tokens['--ui-text'], tokens[surface]) >= 4.5);
        assert.ok(contrast(tokens['--ui-control-border'], tokens[surface]) >= 3);
      }
    }
    const css = themeCSS(recipe);
    assert.match(css, /--ui-surface: light-dark\(/);
    assert.match(css, /\[data-theme="light"\] \{ color-scheme: light; \}/);
    assert.match(css, /\[data-theme="dark"\] \{ color-scheme: dark; \}/);
  }
});


test('coordinated palettes identify their four seeds independently from geometry', () => {
  for (const [id, palette] of Object.entries(themePalettes)) {
    const recipe = defaultRecipe();
    Object.assign(recipe.values, palette.values, { 'control-size': '56px', 'inner-depth': '1.7' });
    assert.equal(paletteFor(recipe), id);
    assert.equal(validateRecipe(recipe).values['control-size'], '56px');
    for (const mode of ['light', 'dark']) {
      const { tokens } = deriveTheme(recipe, { mode });
      assert.ok(contrast(tokens['--ui-text'], tokens['--ui-surface-raised']) >= 4.5);
    }
  }
  const custom = defaultRecipe(); custom.values.action = '#019283';
  assert.equal(paletteFor(custom), 'custom');
});
