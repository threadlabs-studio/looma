import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { toLch, fromLch } from './palette.mjs';
import { themeFields, defaultRecipe, validateRecipe, themeCSS, startingPoints, startingPointFor, startingPointLabels, deriveTheme, themePalettes, paletteFor, applyRefinement, refinementState, materialPresets } from './theme.mjs';

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
  Object.assign(recipe.values, { 'control-roominess': '2.5', 'text-size': '16px', 'response-time': '0.15s', 'space-curve': '2', 'scale-contrast': '1.25' });
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
  for (const value of ['1rem', '2vw']) {
    const relativeBase = defaultRecipe(); relativeBase.values['text-size'] = value;
    assert.throws(() => validateRecipe(relativeBase), /px value for the document root/);
  }
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
const composite = (foreground, background, alpha) => '#' + [1, 3, 5].map(i => Math.round(parseInt(foreground.slice(i, i + 2), 16) * alpha + parseInt(background.slice(i, i + 2), 16) * (1 - alpha)).toString(16).padStart(2, '0')).join('');

test('Forest & cream pairs a forest accent with cream light neutrals', () => {
  const recipe = applyRefinement(defaultRecipe(), 'palette', 'garden');
  const { tokens } = deriveTheme(recipe, { mode: 'light' });
  const rgb = name => [1, 3, 5].map(i => parseInt(tokens[name].slice(i, i + 2), 16));
  for (const name of ['--ui-surface', '--ui-surface-raised', '--ui-neutral-surface']) {
    const [r, g, b] = rgb(name);
    assert.ok(r > g && g > b, `${name} should be warm cream, received ${tokens[name]}`);
  }
  const [r, g] = rgb('--ui-accent');
  assert.ok(g > r, 'accent remains forest green');
});

test('starter rhythm is independent from gap spacing and exports a unitless seed', () => {
  assert.ok(Number(startingPoints.wiki.values.rhythm) < Number(startingPoints.clear.values.rhythm));
  assert.ok(Number(startingPoints.editorial.values.rhythm) > Number(startingPoints.clear.values.rhythm));
  const recipe = structuredClone(startingPoints.wiki);
  recipe.values.rhythm = '1.5';
  assert.equal(deriveTheme(recipe).tokens['--ui-rhythm'], '1.5');
  assert.equal(recipe.values.spacing, startingPoints.wiki.values.spacing);
  assert.throws(() => validateRecipe({ ...recipe, values: { ...recipe.values, rhythm: '1.5rem' } }));
});

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
    const recipe = { ...startingPoints.clear, values: { ...startingPoints.clear.values, ...colors } };
    const { tokens, adjustments } = deriveTheme(recipe);
    const surfaces = ['--ui-surface', '--ui-surface-raised', '--ui-surface-sunken'].map(name => tokens[name]);
    for (const name of ['--ui-text', '--ui-text-secondary', '--ui-text-muted']) {
      for (const surface of surfaces) assert.ok(contrast(tokens[name], surface) >= 4.5, `${name} on ${surface}`);
    }
    for (const name of ['--ui-control-border', '--ui-focus-ring']) {
      for (const surface of surfaces) assert.ok(contrast(tokens[name], surface) >= (name === '--ui-control-border' ? Number(recipe.values['neutral-border-contrast']) : 3), `${name} on ${surface}`);
    }
    for (const tone of ['accent', 'danger', 'success', 'warning', 'info']) {
      for (const state of ['', '-hover', '-active']) assert.ok(contrast(tokens[`--ui-${tone}${state}`], tokens[`--ui-on-${tone}`]) >= 4.5, `${tone}${state} solid`);
      for (const surface of surfaces) assert.ok(contrast(tokens[`--ui-${tone}-subtle-text`], surface) >= 4.5, `${tone} text on ${surface}`);
    }
    assert.ok(Array.isArray(adjustments));
    assert.deepEqual(recipe.values, { ...startingPoints.clear.values, ...colors }, 'authoring seeds remain editable');
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
        assert.ok(contrast(tokens['--ui-control-border'], tokens[surface]) >= Number(recipe.values['neutral-border-contrast']));
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

test('relative geometry and shared control roominess derive from an explicit pixel root', () => {
  const recipe = defaultRecipe();
  recipe.values['corner-roundness'] = '1.125rem';
  recipe.values['control-roominess'] = '2.5';
  recipe.values.spacing = '1.2';
  const css = themeCSS(recipe);
  assert.match(css, /--ui-radius-md: clamp\(0px, calc\(1\.125 \* var\(--_ui-root-font-unit, 1rem\)\), 32px\)/);
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
    assert.ok(contrast(tokens['--ui-control-border'], tokens['--ui-surface']) >= Number(recipe.values['neutral-border-contrast']));
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
  assert.ok(!themeCSS(startingPoints.clear).includes('fonts.googleapis.com'));
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
      assert.ok(contrast(tokens['--ui-control-border'],tokens[surface]) >= Number(recipe.values['neutral-border-contrast']), `${relationship}/${mode} boundary`);
    }
    for (const tone of ['accent','danger','success','warning','info']) assert.ok(contrast(tokens[`--ui-${tone}`],tokens[`--ui-on-${tone}`]) >= 4.5, `${relationship}/${mode}/${tone}`);
  }
});

test('relative length guards retain the same pixel limits at every document root', () => {
  const recipe=defaultRecipe(); recipe.values['text-size']='18px'; recipe.values['line-weight']='0.027778rem';
  assert.match(themeCSS(recipe), /--ui-border-width: clamp\(0\.5px, calc\(0\.027778 \* var\(--_ui-root-font-unit, 1rem\)\), 3px\)/);
  recipe.values['text-size']='14px'; recipe.values['corner-roundness']='2.285714rem';
  assert.match(themeCSS(recipe), /--ui-radius-md: clamp\(0px, calc\(2\.285714 \* var\(--_ui-root-font-unit, 1rem\)\), 32px\)/);
});

test('filled tones preserve their seeds while ink, text and focus adapt independently across flips', () => {
  for (const action of ['#ffb84d', '#ffffcc', '#ffffff', '#111111', '#888888', '#003366']) {
    for (const canvas of ['#ffffff', '#111111']) for (const surface of ['#ffffff', '#111111']) {
      const recipe = defaultRecipe(); Object.assign(recipe.values, { action, canvas, surface, text: canvas });
      for (const mode of ['light', 'dark']) {
        const { tokens } = deriveTheme(recipe, { mode });
        assert.equal(tokens['--ui-accent'], action, `${action}/${canvas}/${surface}/${mode}: fill keeps identity`);
        const sharedOpacity = Math.min(Number(deriveTheme(recipe, { mode: 'light' }).tokens['--ui-tonal-opacity']), Number(deriveTheme(recipe, { mode: 'dark' }).tokens['--ui-tonal-opacity']));
        assert.ok(themeCSS(recipe).includes(`--ui-tonal-opacity: ${sharedOpacity};`), 'export uses the safer shared opacity across both modes');
        const foreground = tokens['--ui-on-accent'];
        assert.equal(tokens['--ui-field-danger'], tokens['--ui-danger-subtle-text']);
        for (const tone of ['danger', 'success', 'warning', 'info']) {
          assert.ok(contrast(tokens[`--ui-${tone}`], tokens[`--ui-on-${tone}`]) >= 4.5, `${tone}/${mode}: filled status ink`);
          for (const background of ['--ui-surface', '--ui-surface-raised', '--ui-surface-sunken']) assert.ok(contrast(tokens[`--ui-${tone}-subtle-text`], tokens[background]) >= 4.5, `${tone}/${mode}: contextual status text`);
        }
        for (const hook of ['code-keyword', 'link-color', 'toolbar-active-text', 'mention-color']) assert.equal(tokens[`--ui-editor-${hook}`], tokens['--ui-accent-subtle-text']);
        for (const suffix of ['', '-hover', '-active', '-reflection']) assert.ok(contrast(tokens[`--ui-accent${suffix}`], foreground) >= 4.5, `${action}${suffix}/${mode}: on-fill ink`);
        for (const background of ['--ui-surface', '--ui-surface-raised', '--ui-surface-sunken', '--ui-selection-surface']) {
          assert.ok(contrast(tokens['--ui-accent-subtle-text'], tokens[background]) >= 4.5, `${action}/${mode}: contextual text`);
        }
        for (const background of ['--ui-surface', '--ui-surface-raised', '--ui-surface-sunken']) {
          assert.ok(contrast(tokens['--ui-focus-ring'], tokens[background]) >= 3, `${action}/${mode}: focus`);
          for (const alpha of [.05, .08, .12, .18]) {
            const a = [1, 3, 5].map(i => parseInt(action.slice(i, i + 2), 16));
            const b = [1, 3, 5].map(i => parseInt(tokens[background].slice(i, i + 2), 16));
            const painted = '#' + a.map((n, i) => Math.round(n * alpha * sharedOpacity + b[i] * (1 - alpha * sharedOpacity)).toString(16).padStart(2, '0')).join('');
            assert.ok(contrast(tokens['--ui-accent-subtle-text'], painted) >= 4.5, `${action}/${mode}: outlined/ghost alpha ${alpha}`);
          }
        }
      }
    }
  }
});

test('Fraunces uses the existing font picker provenance and travels with Lato in exported CSS', () => {
  const recipe = defaultRecipe();
  recipe.values['body-font'] = '"Lato", sans-serif';
  recipe.values['display-font'] = '"Fraunces", serif';
  recipe.fonts = { 'body-font': 'Lato', 'display-font': 'Fraunces' };
  assert.deepEqual(validateRecipe(JSON.parse(JSON.stringify(recipe))).fonts, recipe.fonts);
  assert.match(themeCSS(recipe), /family=Fraunces:wght@400;500;600;700/);
  assert.match(themeCSS(recipe), /family=Lato:wght@400;700/);
});


test('material reflection composes readably over filled states without changing palette decisions', () => {
  const systemCSS = readFileSync(new URL('../../src/tokens/theme-system.css', import.meta.url), 'utf8');
  const composite = (paint, background, alpha) => {
    const a = [1, 3, 5].map(i => parseInt(paint.slice(i, i + 2), 16));
    const b = [1, 3, 5].map(i => parseInt(background.slice(i, i + 2), 16));
    return '#' + a.map((n, i) => Math.round(n * alpha + b[i] * (1 - alpha)).toString(16).padStart(2, '0')).join('');
  };
  for (const action of ['#ffb84d', '#0066cc', '#7c3aed', '#008842', '#dd2233', '#ffffff', '#111111', '#888888', '#003366']) for (const light of ['#ffffff', '#ffbc70', '#75baff', '#00ff00']) {
    for (const mode of ['light', 'dark']) {
      const base = defaultRecipe(); Object.assign(base.values, { action, 'light-color': light });
      const palette = deriveTheme(base, { mode }).tokens;
      for (const finish of ['0', '.5', '1']) for (const strength of ['0', '.5', '1']) {
        const recipe = structuredClone(base);
        Object.assign(recipe.values, { finish, 'light-strength': strength, 'light-x': '0', 'light-y': '1', 'light-spread': '1' });
        const { tokens } = deriveTheme(recipe, { mode });
        assert.equal(tokens['--ui-finish'], finish);
        assert.equal(tokens['--ui-light-strength'], strength);
        for (const role of ['accent', 'danger', 'success', 'warning', 'info']) {
          assert.equal(tokens[`--ui-${role}`], palette[`--ui-${role}`], 'material and palette remain independent');
          const highlight = systemCSS.split('\n').find(line => line.includes(`--ui-${role}-highlight:`));
          assert.ok(highlight.includes(`var(--ui-${role}-reflection`));
          for (const property of ['finish', 'light-strength', 'light-x', 'light-y', 'light-spread']) assert.ok(highlight.includes(`var(--ui-${property})`), `${role}: shared ${property}`);
          for (const state of ['', '-hover', '-active']) {
            // Radial position/spread only change the interpolation weight. Include
            // the full stop at maximum Finish and strength, plus its fade to zero.
            for (let weight = 0; weight <= 1; weight += .125) {
              for (const shadeWeight of [0, .5, 1]) for (const specularWeight of [0, .5, 1]) {
              const shaded = composite(tokens[`--ui-${role}-shade`], tokens[`--ui-${role}${state}`], Number(finish) * Number(strength) * .7 * shadeWeight);
              const reflected = composite(tokens[`--ui-${role}-reflection`], shaded, Number(finish) * Number(strength) * weight);
              const painted = composite(tokens[`--ui-${role}-specular`], reflected, Number(finish) * Number(strength) * specularWeight);
              assert.ok(contrast(painted, tokens[`--ui-on-${role}`]) >= 4.5, `${action}/${mode}/${role}${state}/finish${finish}/strength${strength}/weight${weight}`);
              }
            }
          }
        }
        for (const [reflection, backgrounds] of [['surface', ['surface', 'surface-raised', 'surface-sunken']], ['neutral', ['neutral-surface', 'neutral-hover', 'neutral-active']]]) {
          for (const background of backgrounds) for (const shadeWeight of [0, .5, 1]) for (const specularWeight of [0, .5, 1]) for (let weight = 0; weight <= 1; weight += .125) {
            const shaded = composite(tokens[`--ui-${reflection}-shade`], tokens[`--ui-${background}`], Number(finish) * Number(strength) * .7 * shadeWeight);
            const reflected = composite(tokens[`--ui-${reflection}-reflection`], shaded, Number(finish) * Number(strength) * weight);
            const painted = composite(tokens[`--ui-${reflection}-specular`], reflected, Number(finish) * Number(strength) * specularWeight);
            const labels = reflection === 'surface' ? ['--ui-text', '--ui-text-secondary', ...['accent', 'danger', 'success', 'warning', 'info'].map(role => `--ui-${role}-subtle-text`)] : ['--ui-text'];
            for (const label of labels) assert.ok(contrast(painted, tokens[label]) >= 4.5, `${action}/${mode}/${reflection}/${label}`);
          }
        }
      }
    }
  }
});


test('environment light changes reflected hue across roles without changing pigment or other material decisions', () => {
  const recipe = defaultRecipe(); recipe.values.action = '#ffb84d';
  for (const mode of ['light', 'dark']) {
    const warm = deriveTheme({ ...recipe, values: { ...recipe.values, 'light-color': '#ffbc70' } }, { mode }).tokens;
    const cool = deriveTheme({ ...recipe, values: { ...recipe.values, 'light-color': '#75baff' } }, { mode }).tokens;
    for (const role of ['accent', 'danger', 'success', 'warning', 'info', 'surface', 'neutral']) {
      assert.notEqual(warm[`--ui-${role}-reflection`], cool[`--ui-${role}-reflection`], `${role}/${mode}: reflected environment changes`);
    }
    for (const key of ['--ui-accent', '--ui-on-accent', '--ui-text', '--ui-finish', '--ui-light-spread', '--ui-light-strength', '--ui-glassiness']) assert.equal(warm[key], cool[key], `${key}: independent from light color`);
  }
  const material = applyRefinement(recipe, 'material', 'polished'); material.values['light-color'] = '#75baff';
  assert.equal(applyRefinement(material, 'palette', 'garden').values['light-color'], '#75baff');
  assert.equal(applyRefinement(material, 'material', 'matte').values['light-color'], '#ffffff');
});

test('old recipes retain glass property keys, gain neutral light and default to no backdrop blur', () => {
  const recipe = validateRecipe({ schemaVersion: 1, values: { glassiness: '.6', translucency: '.3' } });
  assert.equal(recipe.values['light-color'], '#ffffff');
  assert.equal(recipe.values.glassiness, '.6');
  assert.equal(recipe.values.translucency, '.3');
  assert.equal(validateRecipe({ schemaVersion: 1, values: {} }).values.glassiness, '0');
  const fields = new Map(themeFields.map(field => [field.id, field]));
  assert.equal(fields.get('glassiness').label, 'Frosting');
  assert.equal(fields.get('translucency').label, 'Transparency');
  assert.match(themeCSS(recipe), /--ui-glassiness: .6;/);
  assert.match(themeCSS(recipe), /--ui-overlay-translucency: .3;/);
  assert.equal(fields.get('light-color').family, 'Material');
  assert.deepEqual(validateRecipe(JSON.parse(JSON.stringify(recipe))), recipe);
  assert.throws(() => validateRecipe({ ...recipe, values: { ...recipe.values, 'light-color': 'red; background:red' } }));
});

test('glass keeps a mostly opaque content plane, decorative transmission and zero-blur defaults', () => {
  const system = readFileSync(new URL('../../src/tokens/theme-system.css', import.meta.url), 'utf8');
  assert.doesNotMatch(system, /--ui-overlay-surface:/, "optional group overrides must not mask semantic status surfaces");
  assert.match(system, /--ui-material-content: color-mix\(in srgb, var\(--ui-surface-raised\)/);
  assert.match(system, /--ui-material-glass: color-mix\(in srgb, var\(--ui-surface-raised\) calc\(\(1 - clamp\(0, var\(--ui-overlay-translucency\), 1\)\) \* 100%\), transparent\);/);
  for (const tag of ['ui-card', 'ui-popover', 'ui-dialog', 'ui-menu', 'ui-tooltip']) {
    const html = readFileSync(new URL(`../../src/components/${tag}/${tag}.html`, import.meta.url), 'utf8');
    assert.ok(!html.includes('saturate('), `${tag}: Frosting does not saturate or change opacity`);
    const rim = html.split('\n').find(line => /--_ui-(panel|material)-rim:/.test(line));
    assert.ok(rim.includes('separation') && !rim.includes('glass'), `${tag}: only separation owns rim extent`);
    assert.match(html, /backdrop-filter: blur\(calc\(var\(--_ui-(panel-glass|material-glassiness)\) \*/);
    assert.match(html, /linear-gradient\(var\(--_ui-(card-material-content|material-content-color)\), var\(--_ui-(card-material-content|material-content-color)\)\) padding-box/);
    assert.ok(html.indexOf(') padding-box,') < html.indexOf(') border-box;'), `${tag}: the content plane covers the decorative backdrop`);
    for (const query of ['prefers-reduced-transparency: reduce', 'forced-colors: active']) {
      const fallback = html.slice(html.indexOf(`@media (${query})`));
      assert.match(fallback, /backdrop-filter: none;/);
      assert.match(fallback, /background: (var\(--_ui-card-surface\)|oklch\(from var\(--_ui-material-content-color\) l c h \/ 1\)|Canvas);/);
    }
  }
});


test('opposing environmental hues keep readable intermediate material colors', () => {
  for (const [action, light] of [['#ff0000', '#00ff00'], ['#00ff00', '#ff0000'], ['#0000ff', '#ffff00'], ['#ffff00', '#0000ff']]) {
    const recipe = defaultRecipe(); Object.assign(recipe.values, { action, 'light-color': light });
    for (const mode of ['light', 'dark']) {
      const { tokens } = deriveTheme(recipe, { mode });
      for (const role of ['accent', 'danger', 'success', 'warning', 'info']) for (const [start, end] of [['shade', 'reflection'], ['reflection', 'specular'], ['shade', 'specular']]) {
        const a = [1, 3, 5].map(i => parseInt(tokens[`--ui-${role}-${start}`].slice(i, i + 2), 16));
        const b = [1, 3, 5].map(i => parseInt(tokens[`--ui-${role}-${end}`].slice(i, i + 2), 16));
        for (let step = 0; step <= 256; step++) {
          const sample = '#' + a.map((n, i) => Math.round(n + (b[i] - n) * step / 256).toString(16).padStart(2, '0')).join('');
          assert.ok(contrast(sample, tokens[`--ui-on-${role}`]) >= 4.5, `${action}/${light}/${role}/${mode}/${step}`);
        }
      }
    }
  }
});


test('neutral illumination keeps colored material chromatic and neutral material neutral', () => {
  const pigments = ['#2e1228', '#ffb84d', '#ff8c00', '#0066cc', '#7c3aed', '#008842', '#dd2233', '#003366', '#ffffff', '#888888', '#111111'];
  const hueDistance = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  for (const action of pigments) for (const mode of ['light', 'dark']) {
    const recipe = defaultRecipe(); recipe.values.action = action;
    const { tokens } = deriveTheme(recipe, { mode });
    const [l, c, h] = toLch(action);
    const [shadeL, shadeC, shadeH] = toLch(tokens['--ui-accent-shade']);
    const [reflectedL, reflectedC, reflectedH] = toLch(tokens['--ui-accent-reflection']);
    assert.equal(tokens['--ui-accent'], action, 'material never substitutes pigment');
    assert.ok(shadeL <= l + .002 && l - shadeL <= .052, `${action}: restrained perceptual recession`);
    if (c > .02) {
      assert.ok(hueDistance(h, shadeH) < 1, `${action}: shade retains hue`);
      assert.ok(Math.abs(shadeC / shadeL - c / l) < .015, `${action}: shade retains relative saturation`);
      assert.ok(hueDistance(h, reflectedH) < 1, `${action}: neutral light retains reflected hue`);
      assert.ok(reflectedC + .002 >= c * Math.max(1, reflectedL / l), `${action}: reflection keeps relative saturation rather than whitening the whole pigment`);
      if (action === '#2e1228') assert.ok(reflectedC / reflectedL > c / l, 'wine reflection adds relative saturation as it brightens');
    } else {
      for (const part of ['shade', 'reflection', 'specular']) {
        const value = tokens[`--ui-accent-${part}`];
        assert.equal(value.slice(1, 3), value.slice(3, 5), `${action}/${part}: no unwanted neutral tint`);
        assert.equal(value.slice(3, 5), value.slice(5, 7), `${action}/${part}: no unwanted neutral tint`);
      }
    }
    const channels = value => [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16));
    const reflected = channels(tokens['--ui-accent-reflection']);
    assert.ok(channels(tokens['--ui-accent-specular']).every((channel, i) => channel >= reflected[i]), `${action}: bounded specular is above the chromatic reflection`);
  }
  const system = readFileSync(new URL('../../src/tokens/theme-system.css', import.meta.url), 'utf8');
  for (const role of ['accent', 'danger', 'success', 'warning', 'info', 'neutral', 'surface', 'knob', 'knob-on-accent']) {
    const image = system.split('\n').find(line => line.includes(`--ui-${role}-highlight:`));
    assert.ok(image.includes(' in srgb,'), `${role}: checked RGB interpolation is explicit`);
    assert.equal((image.match(/radial-gradient/g) ?? []).length, 1, `${role}: one paint preserves consumer layering`);
    assert.ok(image.includes(`--ui-${role}-reflection`));
    assert.ok(!image.includes(`--ui-${role}-specular`), `${role}: no isolated bright dot`);
    assert.ok(image.includes('ellipse farthest-corner'), `${role}: illumination reaches the complete surface`);
    assert.ok(image.includes('var(--ui-light-spread) * 30%'), `${role}: spread opens the chromatic reflection`);
    assert.ok(!/, transparent (?:calc|\d)/.test(image), `${role}: no flat clearing between reflection and shade`);
  }
});

test('painted knob surfaces keep non-text contrast against their actual track paint', () => {
  const range = colors => {
    const values = colors.map(luminance);
    return [Math.min(...values), Math.max(...values)];
  };
  const paints = stops => {
    const values = [...stops];
    for (let a = 0; a < stops.length; a++) for (let b = a + 1; b < stops.length; b++) {
      const first = [1, 3, 5].map(i => parseInt(stops[a].slice(i, i + 2), 16));
      const last = [1, 3, 5].map(i => parseInt(stops[b].slice(i, i + 2), 16));
      for (let step = 1; step < 32; step++) values.push('#' + first.map((n, i) => Math.round(n + (last[i] - n) * step / 32).toString(16).padStart(2, '0')).join(''));
    }
    return values;
  };
  for (const action of ['#ffb84d', '#0066cc', '#7c3aed', '#008842', '#dd2233', '#ffffff', '#111111', '#888888']) for (const light of ['#ffffff', '#ffbc70', '#75baff', '#00ff00']) for (const mode of ['light', 'dark']) {
    const recipe = defaultRecipe(); Object.assign(recipe.values, { action, 'light-color': light });
    const { tokens } = deriveTheme(recipe, { mode });
    for (const [knob, base, track, trackBase] of [['knob', '--ui-text-secondary', 'surface', '--ui-surface-raised'], ['knob-on-accent', '--ui-on-accent', 'accent', '--ui-accent']]) {
      const parts = ['reflection', 'shade', 'specular'];
      const foregrounds = paints([tokens[base], ...parts.map(part => tokens[`--ui-${knob}-${part}`])]);
      const backgrounds = paints([tokens[trackBase], ...parts.map(part => tokens[`--ui-${track}-${part}`])]);
      const [foreMin, foreMax] = range(foregrounds), [backMin, backMax] = range(backgrounds);
      const minimum = foreMax < backMin ? (backMin + .05) / (foreMax + .05) : backMax < foreMin ? (foreMin + .05) / (backMax + .05) : 1;
      assert.ok(minimum >= 3, `${action}/${light}/${mode}/${knob}: full independent knob/track paint ${minimum}`);
    }
  }
});

test('choice frames recess only empty wells and reuse shared state/material boundaries', () => {
  const checkbox = readFileSync(new URL('../../src/components/ui-checkbox/ui-checkbox.html', import.meta.url), 'utf8');
  const radio = readFileSync(new URL('../../src/components/ui-radio/ui-radio.html', import.meta.url), 'utf8');
  const toggle = readFileSync(new URL('../../src/components/ui-switch/ui-switch.html', import.meta.url), 'utf8');
  assert.match(checkbox, /input:checked,\s*input:indeterminate\s*\{[^}]*box-shadow: none;/);
  assert.match(checkbox, /input\s*\{[^}]*box-shadow: var\(--ui-control-inset\);/);
  assert.match(radio, /input\s*\{[^}]*box-shadow: var\(--ui-control-inset\);/);
  assert.match(radio, /input:checked\s*\{[^}]*background-image: var\(--ui-accent-highlight, none\);[^}]*box-shadow: none;/);
  assert.match(radio, /input:checked::after\s*\{[^}]*opacity: 1;/);
  assert.match(radio, /input::after\s*\{[^}]*background-color: var\(--ui-text-on-accent\);/);
  assert.match(radio, /@media \(forced-colors: active\)[\s\S]*appearance: auto;[\s\S]*input::after\s*\{\s*display: none !important;\s*\}/);
  assert.match(toggle, /input::after\s*\{[^}]*background-image: var\(--ui-knob-highlight, none\);/);
  assert.match(toggle, /input:checked::after\s*\{[^}]*background-image: var\(--ui-knob-on-accent-highlight, none\);/);
  assert.match(toggle, /:host\(\[disabled\]\) input::after\s*\{[^}]*background-image: none;/);
  assert.match(toggle, /input:focus-visible\s*\{[^}]*var\(--ui-focus-ring/);
});


const separationOK = (one, two) => {
  const lab = colour => { const [l,c,h] = toLch(colour); return [l,c*Math.cos(h*Math.PI/180),c*Math.sin(h*Math.PI/180)]; };
  const a=lab(one), b=lab(two); return Math.hypot(...a.map((v,i)=>v-b[i]));
};
test('filled actions resolve a coupled hierarchy across light, dark and nearly merged palettes', () => {
  for (const mode of ['light','dark']) for (const surface of ['#ffffff','#f6efe4','#181126']) for (const action of ['#ffb84d','#2563eb','#ffffff','#000000','#f7f7f5','#28c89b']) {
    const { tokens:t } = deriveTheme({schemaVersion:1,values:{...defaultRecipe().values, action, surface, canvas:surface}}, {mode});
    assert.equal(t['--ui-accent'], action);
    const background=t['--ui-surface-raised'];
    for (const state of ['', '-hover', '-active']) {
      const neutral=t[`--ui-neutral${state || '-surface'}`], edge=t['--ui-control-border'];
      const primaryEdge=t[`--ui-accent${state}-border`];
      assert.ok(contrast(neutral,t['--ui-text'])>=4.5, `${mode}/${surface}/${action}${state}: label`);
      assert.ok(contrast(edge,background)>=2, `${mode}/${surface}/${action}${state}: shared control contour meets its default minimum`);
      assert.ok(separationOK(edge,background) > separationOK(neutral,background)-.004, `${mode}/${surface}/${action}${state}: edge bounds its fill`);
      assert.ok(/^#[a-f0-9]{6}$/.test(primaryEdge));
    }
    assert.notEqual(t['--ui-border-strong'],t['--ui-control-border']);
    assert.ok(contrast(t['--ui-control-border'],background)>=2);
  }
});
test('neutral relationships change hue without following the strength of primary pigment', () => {
  for (const mode of ['light','dark']) {
    const recipe=defaultRecipe();
    const ordinary=deriveTheme(recipe,{mode}).tokens;
    recipe.values.action='#fafafa';
    const adjacent=deriveTheme(recipe,{mode}).tokens;
    assert.equal(ordinary['--ui-control-border'],adjacent['--ui-control-border']);
    recipe.values.action='#2563eb'; recipe.values['neutral-source']='primary';
    assert.notEqual(deriveTheme(recipe,{mode}).tokens['--ui-neutral-surface'],ordinary['--ui-neutral-surface']);
  }
});

test('chroma threshold assistance avoids a contour jump between adjacent seeds', () => {
  const resolve=action=>deriveTheme({schemaVersion:1,values:{...defaultRecipe().values,action,surface:'#bebebe',canvas:'#bebebe'}}, {mode:'light'}).tokens;
  const a=resolve('#b0cd31'), b=resolve('#b0cd30');
  assert.ok(separationOK(a['--ui-accent-border'],b['--ui-accent-border'])<.01);
  assert.ok(separationOK(a['--ui-control-border'],b['--ui-control-border'])<.01);
});

test('Gold is an identified starting theme with portable Google font provenance', () => {
  const gold=validateRecipe(startingPoints.gold);
  assert.equal(startingPointFor(gold),'gold');
  assert.equal(paletteFor(gold),'gold');
  assert.equal(themePalettes.gold.label,'Gold');
  assert.equal(gold.values.action,'#ffb84d');
  assert.equal(gold.values.finish,'0.55');
  assert.deepEqual(gold.fonts,{'body-font':'Lato','display-font':'Fraunces'});
  assert.match(themeCSS(gold),/fonts.googleapis.com/);
  for (const mode of ['light','dark']) {
    const {tokens}=deriveTheme(gold,{mode});
    const [l,c,h]=toLch(tokens['--ui-link-color']), [seedL,seedC,seedH]=toLch(gold.values.action);
    assert.ok(contrast(tokens['--ui-link-color'],tokens['--ui-surface'])>=4.5, `${mode}: gold links clear normal-text contrast`);
    assert.ok(Math.min(Math.abs(h-seedH),360-Math.abs(h-seedH))<1, `${mode}: readable gold retains its hue`);
    assert.ok(c/l>=seedC/seedL-.002, `${mode}: darkening does not muddy relative saturation`);
  }
});

test('Looma is the coordinated default starting point and carries its font provenance', () => {
  const recipe = defaultRecipe();
  assert.equal(startingPointFor(recipe), 'looma');
  assert.equal(startingPointLabels.looma, 'Looma');
  assert.equal(recipe.values.action, '#7658d6');
  assert.equal(recipe.values.canvas, '#fbf9f4');
  assert.equal(recipe.values['text-size'], '17px');
  assert.deepEqual(recipe.fonts, { 'body-font': 'Manrope', 'display-font': 'Manrope' });
  assert.match(themeCSS(recipe), /fonts.googleapis.com/);
  assert.deepEqual(validateRecipe(JSON.parse(JSON.stringify(recipe))), recipe);
});

test('partial recipes export inherited fonts without importing explicitly supplied self-hosted stacks', () => {
  const partial = validateRecipe({ schemaVersion: 1, values: { action: '#123456' } });
  assert.deepEqual(partial.fonts, { 'body-font': 'Manrope', 'display-font': 'Manrope' });
  assert.match(themeCSS(partial), /fonts.googleapis.com/);
  const explicit = validateRecipe({ schemaVersion: 1, values: { 'body-font': 'Arial, sans-serif', 'display-font': 'Georgia, serif' } });
  assert.equal(explicit.fonts, undefined);
  assert.doesNotMatch(themeCSS(explicit), /fonts.googleapis.com/);
});


test('field-label sizing follows body by default and exports an independent public role when chosen', () => {
  const recipe = defaultRecipe();
  assert.equal(recipe.values['label-size'], 'inherit');
  assert.equal(deriveTheme(recipe).tokens['--ui-field-label-font-size'], 'inherit');
  recipe.values['label-size'] = '14px';
  assert.match(themeCSS(recipe), /--ui-field-label-font-size: 14px;/);
  assert.equal(validateRecipe(JSON.parse(JSON.stringify(recipe))).values['label-size'], '14px');
  for (const value of ['0px', '-1px', 'auto', '12px; color:red']) {
    assert.throws(() => validateRecipe({ ...recipe, values: { ...recipe.values, 'label-size': value } }));
  }
});


test('gold outlines preserve pigment and use the border minimum independently of text contrast', () => {
  const resolve = minimum => {
    const recipe = structuredClone(startingPoints.gold);
    recipe.values['neutral-border-contrast'] = minimum;
    return deriveTheme(recipe, { mode: 'light' }).tokens;
  };
  const low = resolve('1'), normal = resolve('2.1'), strong = resolve('3');
  assert.equal(low['--ui-accent-outline-border'], low['--ui-accent'], 'a visible pigment needs no adjustment');
  for (const [tokens, minimum] of [[normal, 2.1], [strong, 3]]) {
    const border = tokens['--ui-accent-outline-border'];
    const recipe = startingPoints.gold;
    const material = Number(recipe.values.finish) * Number(recipe.values['light-strength']);
    const paints = [composite(tokens['--ui-accent'], tokens['--ui-surface-raised'], .18 * Number(tokens['--ui-tonal-opacity'])), ...['--ui-surface-reflection', '--ui-surface-shade'].map(stop => composite(tokens['--ui-accent'], composite(tokens[stop], tokens['--ui-surface-raised'], material), .12 * Number(tokens['--ui-tonal-opacity'])))];
    const ratio = Math.min(...paints.map(paint => contrast(border, paint)));
    assert.ok(ratio >= minimum && ratio < minimum + .05, 'adjust only enough to meet the chosen minimum');
    const hue = colour => toLch(colour)[2];
    assert.ok(Math.abs(hue(border) - hue(tokens['--ui-accent'])) < 1, 'retain the gold hue');
    assert.equal(tokens['--ui-accent-subtle-text'], low['--ui-accent-subtle-text'], 'border settings do not alter readable text');
  }
  assert.ok(toLch(normal['--ui-accent-outline-border'])[0] > toLch(normal['--ui-accent-subtle-text'])[0]);
});

test('every outline tone meets the chosen border floor in light and dark themes', () => {
  for (const starting of Object.values(startingPoints)) for (const mode of ['light', 'dark']) for (const minimum of ['1.5', '2.1', '3']) {
    const recipe = structuredClone(starting);
    recipe.values['neutral-border-contrast'] = minimum;
    const { tokens } = deriveTheme(recipe, { mode });
    for (const tone of ['accent', 'accent-secondary', 'accent-tertiary', 'success', 'danger', 'warning', 'info']) {
      for (const surface of ['--ui-surface', '--ui-surface-raised', '--ui-surface-sunken']) {
        assert.ok(contrast(tokens[`--ui-${tone}-outline-border`], tokens[surface]) >= Number(minimum), `${mode}/${minimum}/${tone}/${surface}`);
      }
    }
  }
});

test('outline borders and text meet separate contrast minimums against the painted fill in both modes', () => {
  for (const [name, starting] of Object.entries(startingPoints)) for (const mode of ['light', 'dark']) for (const lighting of ['theme', 'maximum']) {
    const recipe = structuredClone(starting);
    if (lighting === 'maximum') Object.assign(recipe.values, { finish: '1', 'light-strength': '1' });
    const { tokens } = deriveTheme(recipe, { mode });
    const material = Number(recipe.values.finish) * Number(recipe.values['light-strength']);
    const opacity = Number(tokens['--ui-tonal-opacity']);
    for (const tone of ['accent', 'accent-secondary', 'accent-tertiary', 'success', 'danger', 'warning', 'info']) {
      for (const role of ['--ui-surface', '--ui-surface-raised', '--ui-surface-sunken']) {
        for (const stop of ['--ui-surface-reflection', '--ui-surface-shade']) for (const alpha of [.08, .12]) {
          const plate = composite(tokens[stop], tokens[role], material);
          const paint = composite(tokens[`--ui-${tone}`], plate, alpha * opacity);
          assert.ok(contrast(tokens[`--ui-${tone}-outline-border`], paint) >= Number(recipe.values['neutral-border-contrast']), `${name}/${mode}/${tone}/${role}/${stop}/${alpha}: border`);
          assert.ok(contrast(tokens[`--ui-${tone}-subtle-text`], paint) >= 4.5, `${name}/${mode}/${tone}/${role}/${stop}/${alpha}: text`);
        }
      }
    }
  }
});

test('outline contrast updates when material finish or light strength changes', () => {
  const recipe = structuredClone(startingPoints.bookish);
  Object.assign(recipe.values, { action: '#371b30', finish: '0', 'light-strength': '1' });
  const flat = deriveTheme(recipe, { mode: 'dark' }).tokens['--ui-accent-outline-border'];
  recipe.values.finish = '1';
  const lit = deriveTheme(recipe, { mode: 'dark' }).tokens['--ui-accent-outline-border'];
  assert.notEqual(lit, flat, 'a stronger reflection requires a brighter border');
  recipe.values['light-strength'] = '0';
  assert.equal(deriveTheme(recipe, { mode: 'dark' }).tokens['--ui-accent-outline-border'], flat);
});

test('neutral boundaries have an editable contrast floor independent of primary pigment', () => {
  for (const mode of ['light','dark']) for (const minimum of ['1.5','2','3']) {
    const recipe=defaultRecipe(); recipe.values['neutral-border-contrast']=minimum;
    const {tokens:t}=deriveTheme(recipe,{mode});
    for(const surface of ['--ui-surface','--ui-surface-raised','--ui-neutral-surface']) assert.ok(contrast(t['--ui-control-border'],t[surface])>=Number(minimum)-.01, `${mode}/${minimum}/${surface}`);
    assert.ok(themeCSS(recipe).includes('--ui-control-border:'));
  }
});

test('brand accents, neutral pigment and semantic mappings survive recipes and CSS exports', () => {
  const recipe=defaultRecipe();
  Object.assign(recipe.values,{'secondary-action':'#e66b70','tertiary-action':'#168779','neutral-source':'secondary','success-source':'primary','danger-source':'secondary','warning-source':'related','info-source':'tertiary'});
  assert.deepEqual(validateRecipe(JSON.parse(JSON.stringify(recipe))),recipe);
  for(const mode of ['light','dark']) {
    const {tokens:t}=deriveTheme(recipe,{mode});
    assert.equal(t['--ui-accent-secondary'],'#e66b70');
    assert.equal(t['--ui-accent-tertiary'],'#168779');
    assert.equal(t['--ui-success'],t['--ui-accent']);
    assert.equal(t['--ui-danger'],t['--ui-accent-secondary']);
    assert.equal(t['--ui-info'],t['--ui-accent-tertiary']);
    assert.notEqual(t['--ui-warning'],t['--ui-accent']);
    for(const tone of ['accent-secondary','accent-tertiary','success','danger','warning','info']) assert.ok(contrast(t[`--ui-${tone}`],t[`--ui-on-${tone}`])>=4.5);
  }
  assert.match(themeCSS(recipe),/--ui-accent-secondary: light-dark\(#e66b70, #e66b70\);/);
});

test('status relationships govern color without accepting direct status color overrides', () => {
  const recipe=defaultRecipe();
  for(const role of ['danger','warning','success','info']) {
    assert.equal(themeFields.some(field=>field.id===role+'-color'),false);
    assert.throws(()=>validateRecipe({...recipe,values:{...recipe.values,[role+'-color']:'#ff0000'}}));
    assert.throws(()=>validateRecipe({...recipe,values:{...recipe.values,[role+'-source']:'custom'}}));
    recipe.values[role+'-source']='primary';
  }
  const {tokens}=deriveTheme(recipe);
  for(const role of ['danger','warning','success','info']) {
    assert.equal(tokens['--ui-'+role],tokens['--ui-accent']);
    assert.equal(tokens['--ui-'+role+'-subtle-text'],tokens['--ui-accent-subtle-text']);
    assert.equal(tokens['--ui-'+role+'-soft'],tokens['--ui-accent-soft']);
  }
});


test('dark mode separates canvas, raised plates, neutral fills and selected rows across palettes', () => {
  for(const recipe of Object.values(startingPoints)) {
    const {tokens:t}=deriveTheme(recipe,{mode:'dark'});
    const lightness=role=>toLch(t['--ui-'+role])[0];
    assert.ok(lightness('surface-raised')-lightness('surface')>=.06, recipe.values.action+': raised plate stays above canvas');
    assert.ok(lightness('neutral-surface')-lightness('surface-raised')>=.06, recipe.values.action+': neutral fill is visible');
    assert.ok(lightness('selection-surface')-lightness('surface-raised')>=.075, recipe.values.action+': selection wash is visible');
    assert.ok(contrast(t['--ui-selection-text'],t['--ui-selection-surface'])>=7, recipe.values.action+': selected text remains clear');
    assert.ok(contrast(t['--ui-control-border'],t['--ui-neutral-surface'])>=Number(recipe.values['neutral-border-contrast'])*1.15-.01);
  }
});

test('quiet light status surfaces stay pale while dark surfaces use readable contextual pigment', () => {
  for(const recipe of Object.values(startingPoints)) {
    for(const mode of ['light','dark']) {
      const {tokens:t}=deriveTheme(recipe,{mode});
      for(const tone of ['success','danger','warning','info']) {
        const fill=t['--ui-'+tone+'-soft'];
        const delta=toLch(fill)[0]-toLch(t['--ui-surface-raised'])[0];
        assert.ok(mode==='light'?delta>=-.055:delta>=.06, `${mode}/${tone}: mode-aware quiet tint`);
        assert.ok(contrast(fill,t['--ui-'+tone+'-subtle-text'])>=4.5,`${mode}/${tone}: text on its actual quiet fill`);
      }
    }
  }
});


test('default semantic colors stay restrained and amber warning separates from red danger', () => {
  for (const mode of ['light', 'dark']) {
    const { tokens: t } = deriveTheme(defaultRecipe(), { mode });
    const chroma = role => toLch(t['--ui-' + role])[1];
    for (const role of ['success', 'warning', 'danger', 'info']) {
      assert.ok(chroma(role) <= chroma('accent') * .8, `${mode}/${role}: semantics support the primary accent`);
      assert.ok(chroma(role + '-soft') <= (mode === 'light' ? .022 : .052), `${mode}/${role}: quiet tint has no green boost`);
      assert.ok(chroma(role + '-subtle-text') <= .123, `${mode}/${role}: restrained contextual ink`);
    }
    const warningHue = toLch(t['--ui-warning-subtle-text'])[2];
    const dangerHue = toLch(t['--ui-danger-subtle-text'])[2];
    assert.ok(warningHue >= 65 && warningHue <= 85, `${mode}: warning retains amber hue`);
    assert.ok(warningHue - dangerHue >= 35, `${mode}: warning is distinct from red danger`);
  }
});


test('dark warm surfaces retain color above the neutral floor', () => {
  const { tokens: t } = deriveTheme(defaultRecipe(), { mode: 'dark' });
  const [warmL, warmC] = toLch(t['--ui-warning-soft']);
  const [coolL, coolC] = toLch(t['--ui-info-soft']);
  assert.ok(warmL >= coolL + .025, 'warm dark tints need a tonal lift to avoid reading as brown-gray');
  assert.ok(warmC >= coolC + .01 && warmC <= .052, 'warm tint compensation stays bounded');
  assert.ok(contrast(t['--ui-warning-subtle-text'], t['--ui-warning-soft']) >= 4.5);
});

test('status relationships coordinate semantic, less-color and primary-icon palettes without changing the brand', () => {
  const original = defaultRecipe();
  const quiet = applyRefinement(original, 'status', 'restrained');
  const primary = applyRefinement(original, 'status', 'primary');
  for (const recipe of [quiet, primary]) {
    assert.equal(recipe.values.action, original.values.action);
    assert.equal(recipe.values.canvas, original.values.canvas);
    assert.equal(recipe.values['outer-depth'], original.values['outer-depth']);
    assert.equal(recipe.values['text-size'], original.values['text-size']);
    assert.deepEqual(refinementState(validateRecipe(JSON.parse(JSON.stringify(recipe))), 'status'),
      { id: recipe.presets.status, customized: false });
  }
  for (const mode of ['light', 'dark']) {
    const normal = deriveTheme(original, { mode }).tokens;
    const restrained = deriveTheme(quiet, { mode }).tokens;
    const shared = deriveTheme(primary, { mode }).tokens;
    for (const role of ['danger','warning','info','success']) {
      for (const suffix of ['', '-soft', '-subtle-text']) {
        assert.ok(toLch(restrained['--ui-' + role + suffix])[1] < toLch(normal['--ui-' + role + suffix])[1] * .8,
          `${mode}/${role}${suffix}: Less color reduces pigment, tint and foreground together`);
        assert.equal(shared['--ui-' + role + suffix], shared['--ui-accent' + suffix]);
      }
      for (const tokens of [restrained, shared]) {
        assert.ok(contrast(tokens['--ui-' + role + '-soft'], tokens['--ui-' + role + '-subtle-text']) >= 4.5);
      }
    }
  }
  quiet.values['info-source'] = 'secondary';
  assert.deepEqual(refinementState(quiet, 'status'), { id: 'restrained', customized: true });
  const restored = applyRefinement(quiet, 'status', 'restrained');
  assert.equal(restored.values['info-source'], 'derived');
  assert.deepEqual(applyRefinement(primary, 'status', 'semantic').values, original.values);
});

test('Bookish coordinates branded guidance, restrained risk states and supporting accents', () => {
  const recipe = startingPoints.bookish;
  assert.deepEqual(recipe.fonts, { 'body-font': 'Open Sans', 'display-font': 'Newsreader' });
  assert.deepEqual(validateRecipe(JSON.parse(JSON.stringify(recipe))), recipe);
  for (const mode of ['light','dark']) {
    const { tokens: t } = deriveTheme(recipe, { mode });
    for (const role of ['info','success']) for (const suffix of ['', '-soft', '-subtle-text']) {
      assert.equal(t['--ui-' + role + suffix], t['--ui-accent' + suffix]);
    }
    for (const role of ['warning','danger']) {
      assert.notEqual(t['--ui-' + role], t['--ui-accent']);
      assert.ok(contrast(t['--ui-' + role + '-subtle-text'], t['--ui-' + role + '-soft']) >= 4.5);
    }
    assert.notEqual(t['--ui-accent-secondary'], t['--ui-accent']);
    assert.notEqual(t['--ui-accent-tertiary'], t['--ui-accent']);
    assert.equal(recipe.values['focus-accent'], 'primary');
    assert.equal(recipe.values['selection-accent'], 'primary');
    assert.equal(recipe.values['link-accent'], 'primary');
  }
  assert.match(themeCSS(recipe), /Newsreader/);
  assert.match(themeCSS(recipe), /Open\+Sans/);
});
