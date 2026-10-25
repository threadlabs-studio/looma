import assert from 'node:assert/strict';
import test from 'node:test';
import { themeFields, defaultRecipe, validateRecipe, themeCSS, startingPoints, startingPointFor, deriveTheme, themePalettes, paletteFor, applyRefinement, refinementState, materialPresets } from './theme.mjs';

test('material presets retain their identity through refinement, reload and scoped restore', () => {
  assert.deepEqual(refinementState(startingPoints.bookish, 'material'), { id: 'glass', customized: false });
  const recipe = applyRefinement(startingPoints.wiki, 'material', 'polished');
  assert.equal(recipe.values.action, startingPoints.wiki.values.action);
  assert.equal(recipe.values['control-roominess'], startingPoints.wiki.values['control-roominess']);
  assert.deepEqual(refinementState(recipe, 'material'), { id: 'polished', customized: false });
  recipe.values['light-x'] = '.2';
  const reloaded = validateRecipe(JSON.parse(JSON.stringify(recipe)));
  assert.deepEqual(refinementState(reloaded, 'material'), { id: 'polished', customized: true });
  const restored = applyRefinement(reloaded, 'material', 'polished');
  assert.equal(restored.values['light-x'], materialPresets.polished.values['light-x']);
  assert.equal(restored.values['control-roominess'], startingPoints.wiki.values['control-roominess']);
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
  Object.assign(recipe.values, { 'control-roominess': '2.5', 'text-size': '1rem', 'response-time': '0.15s', 'space-curve': '2', 'scale-contrast': '1.25' });
  const parsed = validateRecipe(JSON.parse(JSON.stringify(recipe)));
  assert.deepEqual(parsed, recipe);
  const css = themeCSS(parsed);
  assert.match(css, /--ui-control-roominess: 2\.5/);
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
  assert.ok(parseFloat(startingPoints.wiki.values['control-roominess']) < parseFloat(startingPoints.clear.values['control-roominess']));
});

test('rejects invalid recipes and CSS injection rather than producing partial styles', () => {
  for (const [key, value] of [['action', 'red; color:blue'], ['body-font', 'sans-serif;}body{color:red'], ['body-font', 'Arial /*'], ['body-font', '"Unclosed font'], ['control-roominess', '9'.repeat(400) + 'px'], ['control-roominess', '2rem trailing'], ['scale-contrast', '0'], ['translucency', '2'], ['response-curve', 'cubic-bezier(2,0,1,1)']]) {
    const recipe = defaultRecipe(); recipe.values[key] = value;
    assert.throws(() => validateRecipe(recipe), undefined, key);
  }
  assert.throws(() => validateRecipe({ schemaVersion: 100, values: {} }), /version/i);
  assert.throws(() => validateRecipe({ ...defaultRecipe(), values: { unknown: '1' } }), /unknown/i);
});

test('all authoring paths share readable numeric bounds and retain useful native units', () => {
  for (const [key, value] of [['spacing', '.05'], ['scale-contrast', '12'], ['space-curve', '20'], ['text-size', '1px'], ['control-roominess', '1.9'], ['response-time', '12s'], ['line-weight', '0px'], ['text-weight', '10']]) {
    const recipe = defaultRecipe(); recipe.values[key] = value;
    assert.throws(() => validateRecipe(recipe), undefined, `${key}: ${value}`);
    assert.throws(() => themeCSS(recipe), undefined, `export ${key}: ${value}`);
  }
  const responsive = defaultRecipe(); responsive.values['text-size'] = '2vw';
  assert.match(themeCSS(responsive), /--ui-font-size: clamp\(0\.875rem, 2vw, 1\.5rem\)/);
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
  const recipe = defaultRecipe(); recipe.values.spacing = '1.17';
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
    for (const name of ['--ui-text', '--ui-text-secondary', '--ui-text-muted']) {
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
      assert.ok(contrast(tokens['--ui-control-placeholder'], tokens['--ui-control-surface']) >= 4.5, 'field hint remains readable');
      assert.ok(contrast(tokens['--ui-control-placeholder'], tokens['--ui-control-surface']) < contrast(tokens['--ui-text'], tokens['--ui-control-surface']), 'hint is quieter than entered text');
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
    Object.assign(recipe.values, palette.values, { 'control-roominess': '3.5', 'inner-depth': '1.7' });
    assert.equal(paletteFor(recipe), id);
    assert.equal(validateRecipe(recipe).values['control-roominess'], '3.5');
    for (const mode of ['light', 'dark']) {
      const { tokens } = deriveTheme(recipe, { mode });
      assert.ok(contrast(tokens['--ui-text'], tokens['--ui-surface-raised']) >= 4.5);
    }
  }
  const custom = defaultRecipe(); custom.values.action = '#019283';
  assert.equal(paletteFor(custom), 'custom');
});

test('relative type and shared control roominess export relationships without fixed pixel ceilings', () => {
  const recipe = defaultRecipe();
  recipe.values['text-size'] = '1.125rem';
  recipe.values['control-roominess'] = '2.5';
  recipe.values.spacing = '1.2';
  const css = themeCSS(recipe);
  assert.match(css, /--ui-font-size: clamp\(0\.875rem, 1\.125rem, 1\.5rem\)/);
  assert.match(css, /--ui-control-roominess: 2\.5/);
  assert.match(css, /--ui-spacing: 1\.2/);
  assert.throws(() => validateRecipe({ ...recipe, values: { ...recipe.values, density: '1' } }), /Unknown/);
});

test('palette relationships change coordinated surfaces without changing geometry or abandoning paired identity', () => {
  const recipe = structuredClone(startingPoints.bookish);
  Object.assign(recipe.values, { warmth: '.8', 'color-intensity': '.7', 'palette-relationship': 'neighboring' });
  const warmer = deriveTheme(recipe, { mode: 'light' }).tokens;
  const base = deriveTheme(startingPoints.bookish, { mode: 'light' }).tokens;
  assert.notEqual(warmer['--ui-surface'], base['--ui-surface']);
  assert.equal(warmer['--ui-control-roominess'], base['--ui-control-roominess']);
  for (const mode of ['light', 'dark']) {
    const { tokens } = deriveTheme(recipe, { mode });
    assert.ok(contrast(tokens['--ui-text'], tokens['--ui-surface']) >= 4.5);
    assert.ok(contrast(tokens['--ui-control-border'], tokens['--ui-surface']) >= 3);
    assert.notEqual(tokens['--ui-disabled-text'], tokens['--ui-text-secondary']);
  }
  recipe.values['palette-relationship'] = 'arbitrary';
  assert.throws(() => validateRecipe(recipe));
});

test('selected Google fonts travel in the exported CSS and recipe while system fonts need no import', () => {
  const recipe = defaultRecipe(); recipe.values['body-font'] = '"Inter", sans-serif'; recipe.fonts = { 'body-font': 'Inter' };
  const exported = themeCSS(recipe, '@layer theme { :root { --test: 1; } }');
  assert.match(exported, /@import url\("https:\/\/fonts.googleapis.com\/css2\?family=Inter:wght@400;500;600;700&display=swap"\);/);
  assert.ok(exported.indexOf('@import') < exported.indexOf('@layer'));
  assert.deepEqual(validateRecipe(JSON.parse(JSON.stringify(recipe))), recipe);
  assert.ok(!themeCSS(defaultRecipe()).includes('fonts.googleapis.com'));
  recipe.fonts['body-font'] = 'Inter";}body{color:red';
  assert.throws(() => validateRecipe(recipe));
});

test('palette transformations preserve readable roles at their extremes in both modes', () => {
  for (const warmth of ['0','1']) for (const intensity of ['0','1']) for (const relationship of ['preserve','neighboring','complementary']) for (const starting of [startingPoints.bookish, startingPoints.garden, startingPoints.night]) for (const mode of ['light','dark']) {
    const recipe = structuredClone(starting);
    Object.assign(recipe.values, {warmth, 'color-intensity':intensity, 'palette-relationship':relationship});
    const {tokens} = deriveTheme(recipe, {mode});
    for (const surface of ['--ui-surface','--ui-surface-raised','--ui-surface-sunken']) {
      assert.ok(contrast(tokens['--ui-text'],tokens[surface]) >= 4.5, `${relationship}/${mode} body`);
      assert.ok(contrast(tokens['--ui-control-border'],tokens[surface]) >= 3, `${relationship}/${mode} boundary`);
    }
    for (const tone of ['accent','danger','success','warning','info']) assert.ok(contrast(tokens[`--ui-${tone}`],tokens[`--ui-on-${tone}`]) >= 4.5, `${relationship}/${mode}/${tone}`);
  }
});
